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

echo "[IRENX] enabling required App Hub / Cloud Hub APIs..."

# Keep this list explicit. Do not blindly enable every API shown by the Console wizard.
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

gcloud services enable "${SERVICES[@]}" --project="${PROJECT_ID}"

for service in "${SERVICES[@]}"; do
  state="$(gcloud services list --enabled --project="${PROJECT_ID}" --filter="config.name=${service}" --format='value(config.name)')"
  [[ "${state}" == "${service}" ]] || { echo "ERROR: ${service} is not enabled" >&2; exit 3; }
done

# API activation requires serviceusage.services.enable. Google documents
# roles/serviceusage.serviceUsageAdmin as the least-privileged predefined role.
ROLE_CHECK="$(gcloud projects get-iam-policy "${PROJECT_ID}" \
  --flatten='bindings[].members' \
  --filter="bindings.members:${ACCOUNT}" \
  --format='value(bindings.role)' || true)"
if ! grep -Eq 'roles/(owner|editor|serviceusage.serviceUsageAdmin)' <<<"${ROLE_CHECK}"; then
  echo "ERROR: ${ACCOUNT} does not appear to have a role that grants serviceusage.services.enable." >&2
  echo "Grant roles/serviceusage.serviceUsageAdmin on ${PROJECT_ID}, then rerun this script." >&2
  exit 2
fi

echo "[IRENX] API prerequisite check: PASS"
echo "[IRENX] App Hub Admin is required to create/manage applications; grant roles/apphub.admin if App Hub still refuses application creation."
echo "[IRENX] Next: open App Hub and create/register the IRENX application if it is not already present."
