# DevOps Prompt Templates

## 1) Terraform module
> Create a Terraform module for [resource] with inputs [list], outputs [list], and tags [required tags]. Follow secure defaults, avoid hardcoded secrets, and include validation checks. Provide example usage and a brief explanation of state considerations.

## 2) CI/CD workflow
> Write a GitHub Actions workflow that runs lint, tests, security scans, and deployment for [service]. Trigger on pushes and pull requests. Include safe secret usage and conditional deployment to staging only.

## 3) Bash script
> Write a Bash script that validates environment variables, checks prerequisites, and deploys [service] with clear error handling. Make the script idempotent and safe for CI runners.

## 4) Security policy check
> Review this Terraform or Bash configuration for security risks, including secret leakage, overly broad permissions, and unsafe defaults. Provide a prioritized remediation list.
