#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-irenx-506618}"

echo "[IRENX] project=${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}" >/dev/null

ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n1)"
if [[ -z "${ACCOUNT}" ]]; then
  echo "ERROR: no active gcloud account. Run: gcloud auth login" >&2
  exit 1
fi

echo "[IRENX] account=${ACCOUNT}"

# App Hub / Cloud Hub management prerequisites. Keep this list explicit;
# do not blindly enable every API shown by the Console wizard.
SERVICES=(
  serviceusage.googleapis.com
  servicemanagement.googleapis.com
  apphub.googleapis.com
  compute.googleapis.com
  run.googleapis.com
  config.googleapis.com
  cloudasset.googleapis.com
  monitoring.googleapis.com
  logging.googleapis.com
  observability.googleapis.com
)

echo "[IRENX] enabling required APIs..."
gcloud services enable "${SERVICES[@]}" --project="${PROJECT_ID}"

echo "[IRENX] API state:"
gcloud services list --enabled --project="${PROJECT_ID}" \
  --filter='config.name~"(serviceusage|servicemanagement|apphub|compute|run|config|cloudasset|monitoring|logging|observability)\\.googleapis\\.com"' \
  --format='table(config.name)'

# Fail fast if the current identity cannot enable services.
if ! gcloud projects get-iam-policy "${PROJECT_ID}" \
  --flatten='bindings[].members' \
  --filter="bindings.members:${ACCOUNT}" \
  --format='value(bindings.role)' | grep -Eq 'roles/(owner|editor|serviceusage.serviceUsageAdmin|apphub.admin)'; then
  echo "WARNING: could not prove the active identity has a sufficient project role." >&2
  echo "Required for API activation: roles/serviceusage.serviceUsageAdmin (or Owner/Editor)." >&2
  echo "App Hub application management also requires roles/apphub.admin." >&2
  exit 2
fi

# Verify the core APIs instead of trusting the enable command alone.
for service in serviceusage.googleapis.com servicemanagement.googleapis.com apphub.googleapis.com run.googleapis.com config.googleapis.com cloudasset.googleapis.com observability.googleapis.com; do
  state="$(gcloud services list --enabled --project="${PROJECT_ID}" --filter="config.name=${service}" --format='value(config.name)')"
  [[ "${state}" == "${service}" ]] || { echo "ERROR: ${service} is not enabled" >&2; exit 3; }
done

echo "[IRENX] App Hub prerequisite check: PASS"
echo "[IRENX] Next: open App Hub and create/register the IRENX application if it is not already present."
