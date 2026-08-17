#!/usr/bin/env bash
set -euo pipefail

DOMAIN="ai.irenx.com"

if [[ ! -f .env ]]; then
  echo "Missing .env. Copy .env.example to .env and configure OmniRoute, Dify, and market credentials."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker Engine + Compose plugin first."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is required."
  exit 1
fi

if ! getent hosts "$DOMAIN" >/dev/null 2>&1; then
  echo "$DOMAIN does not resolve yet. Point DNS to this server before deploying."
  exit 1
fi

echo "Building and starting IRENX + Caddy for $DOMAIN..."
docker compose up -d --build

echo "Waiting for IRENX container health..."
for _ in {1..30}; do
  if docker inspect --format='{{.State.Health.Status}}' irenx-ai 2>/dev/null | grep -qx healthy; then
    echo "IRENX backend is healthy."
    break
  fi
  sleep 2
done

if ! docker inspect --format='{{.State.Health.Status}}' irenx-ai 2>/dev/null | grep -qx healthy; then
  echo "IRENX health check failed. Inspect: docker compose logs --tail=200 irenx"
  exit 1
fi

if ! curl -fsS --connect-timeout 10 --max-time 20 "https://$DOMAIN/api/health" >/dev/null; then
  echo "HTTPS health check failed. Inspect: docker compose logs --tail=200 caddy irenx"
  exit 1
fi

echo
echo "IRENX is live at https://$DOMAIN"
echo "Health: https://$DOMAIN/api/health"
echo "AI health: https://$DOMAIN/api/ai/health"
