# IRENX Google Cloud recovery

The Cloud Logging error shown for `ServiceUsage.BatchEnableServices` is a Google Cloud provisioning/IAM problem, not an IRENX application error.

For project `irenx-506618`, API activation requires `serviceusage.services.enable`; Google documents `roles/serviceusage.serviceUsageAdmin` as the least-privileged predefined role for this operation. App Hub application management additionally requires App Hub Admin (`roles/apphub.admin`).

## Run from the authenticated Cloud Shell

```bash
gcloud config set project irenx-506618
gcloud auth list
bash infra/gcp/repair-apphub.sh
```

If the script stops with a permission error, grant the active account:

```bash
gcloud projects add-iam-policy-binding irenx-506618 \
  --member="user:$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n1)" \
  --role="roles/serviceusage.serviceUsageAdmin"
```

For App Hub application creation/management, an administrator may also grant:

```bash
gcloud projects add-iam-policy-binding irenx-506618 \
  --member="user:$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n1)" \
  --role="roles/apphub.admin"
```

Then rerun the repair script. Do not grant broad Owner access just to bypass the error.

## Verification

```bash
gcloud services list --enabled --project=irenx-506618

gcloud apphub applications list --project=irenx-506618
```

After the API/IAM layer is clean, verify the IRENX runtime separately:

```bash
curl -fsS https://ai.irenx.com/api/health
```

The repository deliberately does not contain Google credentials, Odoo API keys, or OAuth tokens.
