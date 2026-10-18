# DevOps Prompt Templates

## 1) GitHub Actions workflow
> Create a GitHub Actions workflow for `[service]` that runs linting, tests, security scans, and deployment. Use safe secret handling, only deploy on approved conditions, and include both pull request and push triggers.

## 2) Infrastructure configuration
> Write a Terraform or shell-based configuration for `[resource]` with secure defaults, explicit outputs, and validation checks. Avoid hard-coded secrets and document required inputs and state expectations.

## 3) Deployment script
> Write a deployment script for `[service]` that validates required environment variables, checks prerequisites, and exits cleanly on failure. Make it idempotent and safe for CI environments.

## 4) Security review
> Review this infrastructure or deployment configuration for security issues. Focus on secret leakage, overly broad permissions, unsafe defaults, and deployment conditions. Provide a prioritized remediation list.
