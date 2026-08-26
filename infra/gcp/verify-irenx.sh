#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-irenx-506618}"
SERVICE="${SERVICE:-irenx-api}"
BASE_URL="${BASE_URL:-https://ai.irenx.com}"

pass(){ echo "PASS  $1"; }
fail(){ echo "FAIL  $1" >&2; exit 1; }

command -v gcloud >/dev/null || fail "gcloud CLI not installed"
gcloud config set project "$PROJECT_ID" >/dev/null

ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n1)"
[[ -n "$ACCOUNT" ]] || fail "no active gcloud account"
pass "authenticated: $ACCOUNT"

for api in \
  serviceusage.googleapis.com \
  cloudresourcemanager.googleapis.com \
  apphub.googleapis.com \
  apptopology.googleapis.com \
  cloudasset.googleapis.com \
  config.googleapis.com \
  cloudbuild.googleapis.com \
  storage.googleapis.com \
  run.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  observability.googleapis.com \
  cloudtrace.googleapis.com; do
  state="$(gcloud services list --enabled --project="$PROJECT_ID" --filter="config.name=$api" --format='value(config.name)')"
  [[ "$state" == "$api" ]] || fail "API not enabled: $api"
done
pass "required Google Cloud APIs enabled"

if gcloud run services describe "$SERVICE" --region=asia-southeast1 --project="$PROJECT_ID" >/dev/null 2>&1; then
  pass "Cloud Run service exists: $SERVICE"
else
  echo "WARN  Cloud Run service $SERVICE not found in asia-southeast1; checking all regions"
  if gcloud run services list --project="$PROJECT_ID" --format='value(metadata.name)' | grep -qx "$SERVICE"; then
    pass "Cloud Run service exists: $SERVICE"
  else
    fail "Cloud Run service not found: $SERVICE"
  fi
fi

if curl -fsS --max-time 15 "$BASE_URL/api/health" >/tmp/irenx-health.json; then
  python3 - <<'PY'
import json
p='/tmp/irenx-health.json'
data=json.load(open(p))
if data.get('ok') is not True:
    raise SystemExit('health endpoint returned ok != true')
print('PASS  public health endpoint: ok=true')
PY
else
  fail "public health endpoint unavailable: $BASE_URL/api/health"
fi

if gcloud apphub applications list --project="$PROJECT_ID" --format='value(name)' 2>/dev/null | grep -q .; then
  pass "App Hub application inventory is readable"
else
  echo "WARN  no App Hub application found/readable yet"
fi

echo "IRENX VERIFICATION: PASS"
