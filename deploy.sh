#!/usr/bin/env bash
set -Eeuo pipefail

DOMAIN="${IRENX_DOMAIN:-ai.irenx.com}"
COMPOSE=(docker compose)
ROLLBACK_IMAGE="irenx-ai:rollback"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

rollback() {
  if docker image inspect "$ROLLBACK_IMAGE" >/dev/null 2>&1; then
    echo "Deployment failed; restoring previous IRENX image..."
    docker tag "$ROLLBACK_IMAGE" irenx-ai:latest
    "${COMPOSE[@]}" up -d --no-build irenx caddy || true
  fi
}
trap 'rollback' ERR

[[ -f .env ]] || fail "Missing .env. Copy .env.example to .env and configure required services."
command -v docker >/dev/null 2>&1 || fail "Docker is required."
docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin is required."

# Validate the compose file before changing any running container.
"${COMPOSE[@]}" config -q || fail "docker-compose.yml validation failed."

# Refuse to deploy obvious placeholder credentials.
if grep -Eq '^(OMNIROUTE_API_KEY|DIFY_API_KEY|CLOUDFLARE_API_TOKEN)=(YOUR_|CHANGE_ME|$)' .env; then
  fail "Placeholder or empty production credential detected in .env."
fi

# Keep the previous image for automatic rollback.
if docker image inspect irenx-ai:latest >/dev/null 2>&1; then
  docker tag irenx-ai:latest "$ROLLBACK_IMAGE"
fi

# DNS must resolve before Caddy is started; this prevents a misleading TLS failure.
getent hosts "$DOMAIN" >/dev/null 2>&1 || fail "$DOMAIN does not resolve. Configure DNS first."

echo "Deploying IRENX to https://$DOMAIN ..."
"${COMPOSE[@]}" pull caddy
"${COMPOSE[@]}" build --pull irenx
"${COMPOSE[@]}" up -d irenx

for _ in {1..45}; do
  if docker inspect --format='{{.State.Health.Status}}' irenx-ai 2>/dev/null | grep -qx healthy; then
    break
  fi
  sleep 2
done

docker inspect --format='{{.State.Health.Status}}' irenx-ai 2>/dev/null | grep -qx healthy || fail "IRENX container did not become healthy."

"${COMPOSE[@]}" up -d caddy

for _ in {1..30}; do
  if curl -fsS --connect-timeout 5 --max-time 10 "https://$DOMAIN/api/health" >/dev/null 2>&1; then
    echo "IRENX production health check OK."
    trap - ERR
    docker image rm "$ROLLBACK_IMAGE" >/dev/null 2>&1 || true
    echo "Live: https://$DOMAIN"
    echo "Health: https://$DOMAIN/api/health"
    echo "AI health: https://$DOMAIN/api/ai/health"
    exit 0
  fi
  sleep 2
done

fail "HTTPS health check failed. See: docker compose logs --tail=200 caddy irenx"
