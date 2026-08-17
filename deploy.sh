#!/usr/bin/env bash
set -euo pipefail

DOMAIN="ai.irenx.com"

if [[ ! -f .env ]]; then
  echo "Missing .env. Copy .env.example to .env and set OmniRoute, Dify, and market credentials first."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker Engine + Compose plugin first."
  exit 1
fi

if ! getent hosts "$DOMAIN" >/dev/null 2>&1; then
  echo "$DOMAIN does not resolve yet. Point DNS to this server before deploying."
  exit 1
fi

echo "Building and starting IRENX + Caddy for $DOMAIN..."
docker compose up -d --build

echo "Waiting for IRENX health endpoint..."
for _ in {1..30}; do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null; then
    echo "IRENX backend is healthy."
    break
  fi
  sleep 2
done

curl -fsS "https://$DOMAIN/api/health" || {
  echo "HTTPS health check failed. Inspect: docker compose logs --tail=200 caddy irenx"
  exit 1
}

echo
echo "IRENX is live at https://$DOMAIN"
