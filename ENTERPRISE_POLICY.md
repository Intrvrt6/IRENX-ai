# Enterprise AI Coding Policy

## Purpose

This policy defines the standards for using GitHub Copilot and other AI-assisted coding tools in engineering work. The goal is to increase productivity while preserving code quality, security, and compliance.

## Policy

1. AI-generated code must be reviewed by a qualified human before merge.
2. Developers remain accountable for correctness, security, readability, and maintainability.
3. Generated code must comply with project architecture, standards, and review requirements.
4. AI-assisted code must be validated with relevant tests, type checking, linting, and review processes.
5. Any security-sensitive or compliance-sensitive code must be reviewed by the appropriate authority.
6. AI-generated content must not bypass existing approval workflows.
7. Generated code must not include secrets, insecure defaults, or unsafe dependency choices.
8. Teams must exercise discretion when requesting code that may resemble public or third-party implementations.

## Required controls
- human review before merge
- code explanation required for non-trivial generated changes
- validation of input handling, auth, and data flows
- dependency scanning and secret scanning for new code
- explicit testing for changed behavior and edge cases
- review of AI-generated code in security-sensitive components

## Prohibited use
- using AI output as an unchecked implementation source for production code
- merging generated code without review
- bypassing security review in auth, data handling, or privileged operations
- using AI tools to hide weak reasoning or skip testing
- introducing secrets, insecure defaults, or unvalidated dependency code

## Enforcement

Engineering leads and reviewers are responsible for enforcing this policy through PR review, policy checks, and standards enforcement.

## Summary

Copilot is a development accelerator. It does not replace expertise, review, or responsibility.
