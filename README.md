# GitHub Copilot: Enterprise Guidance for IRENX-ai

## Purpose

This repository is primarily TypeScript-based (approximately 63%), with supporting Shell, JavaScript, HTML, Rust, and Python usage. GitHub Copilot is a valuable acceleration tool for this codebase, especially for TypeScript service code, frontend components, API typing, tests, and repetitive implementation work.

This guide defines how to use Copilot responsibly in IRENX-ai and how to validate AI-assisted changes before they are merged.

## Scope

This guidance applies to:
- new feature development
- refactors and cleanup
- API and UI work
- test generation
- bug investigation and root-cause analysis
- infrastructure and deployment automation

## Core principles

1. Copilot accelerates work; it does not replace engineering judgment.
2. Every generated or modified change must be reviewed by a human.
3. Security, data handling, and permission logic must be validated explicitly.
4. AI-generated code must follow repository architecture, type safety, and code quality standards.
5. Generated code must be explainable and maintainable.

---

## 1. Recommended usage by task type

### Use Copilot for
- generating TypeScript interfaces, types, and API contracts
- writing unit and integration tests
- scaffolding repetitive components, helpers, and reducers
- explaining existing TypeScript logic in plain English
- generating initial implementation drafts for CRUD, validation, and schema work
- refactoring repeated patterns and mechanical changes

### Do not use Copilot as a replacement for
- architecture decisions
- security review
- production readiness checks
- access-control and authorization validation
- final code review before merge
- compliance-sensitive logic or inference decisions

---

## 2. Repository-specific guidance for IRENX-ai

Because this repository is heavily TypeScript-based, Copilot is most effective when prompts are explicit about:
- the target TypeScript module or component
- exact input and output types
- API contracts and response shapes
- runtime assumptions
- edge cases, error handling, and retry behavior
- required tests and validation steps

### Good prompt pattern for this repo
> Generate a TypeScript function in `[file path]` that takes `[input type]` and returns `[output type]`. Validate all required fields, handle `null`/`undefined` gracefully, keep the function side-effect free, and add Jest or Vitest tests for success, validation failure, and edge cases.

### Avoid weak prompts like
> Write a helper for this.

Weak prompts usually produce low-quality guesses and require significant rework.

---

## 3. Required review standards

Before accepting any Copilot-generated change:
- read the code carefully before merging it
- confirm it matches the existing architecture and coding patterns
- validate all error paths and edge cases
- ensure type safety and null handling is correct
- run the relevant tests, linting, and static checks
- verify security-sensitive logic with a human reviewer

### Minimum validation for TypeScript code
- TypeScript compile check
- unit tests for changed behavior
- linting or formatting checks
- dependency review if new packages are introduced
- input validation review for API, env, and user data

---

## 4. Security and IP controls

### AI-generated code policy
- Treat generated code as draft material unless reviewed and verified.
- Do not merge code you cannot explain or reason about.
- Check for obvious similarity to public code or incompatible licensing patterns.
- Ensure generated code aligns with repository conventions and architecture.

### Security requirements
Generated code must be checked for:
- unsafe input handling
- missing validation
- secret leakage in config or logs
- weak auth or authorization checks
- improper use of environment variables
- unsafe dependency choices
- vulnerable serialization or deserialization patterns
- insufficient error handling in network or external integrations

### Required review gates
- human review before merge
- security review for auth, tokens, permissions, or data access changes
- explicit validation of secrets, environment config, and outbound requests
- no production merge based solely on AI output

---

## 5. Prompting best practices for this repo

### Recommended prompt structure
Use this pattern for complex tasks:

- Goal: what should the code do?
- Context: which file, module, or service?
- Constraints: TypeScript types, performance, API behavior, edge cases
- Output: expected return shape or file changes
- Validation: tests or checks required

Example:
> Review the TypeScript module in `src/services/auth.ts`. Add a typed helper that validates a JWT payload, returns a structured error object for invalid tokens, and preserves current API contract compatibility. Include unit tests for valid, expired, malformed, and missing token cases.

### For large tasks
Break work into smaller prompts:
- design the function signature
- implement the logic
- add tests
- review for edge cases
- perform final validation

---

## 6. Team workflow

Use this workflow for all AI-assisted work:

1. Define the requirement clearly.
2. Provide exact file paths or symbol names.
3. Ask Copilot for a small, bounded implementation.
4. Review the output in context.
5. Validate with tests, type checks, and linting.
6. Check security, error handling, and auth/authorization boundaries.
7. Submit for human review.
8. Merge only after approval.

---

## 7. Prompt templates for IRENX-ai

### TypeScript utility or service
> Implement a TypeScript helper in `[path]` that accepts `[input type]` and returns `[output type]`. Validate required fields, handle `null` and `undefined`, and preserve existing error semantics. Add tests for happy path, invalid input, and edge cases.

### Frontend component
> Create a React/TypeScript component in `[path]` that renders `[behavior]`. Use typed props, accessible markup, loading and error states, and include unit tests for render, interaction, and recovery behavior.

### API contract or DTO work
> Define TypeScript interfaces for `[API endpoint]` based on the expected payload and response. Keep names consistent with the repo conventions, include optional fields accurately, and document assumptions in comments.

### Bug investigation
> Explain the TypeScript code in `[path]` and identify likely failure points for `[bug symptom]`. Suggest the most probable root cause, validation steps, and a minimal fix with tests.

### Security review
> Review this TypeScript code for security issues. Focus on validation, token handling, user input, authorization checks, and unsafe external calls. Provide a prioritized fix list and minimal patch recommendations.

---

## 8. Final policy

GitHub Copilot is a force multiplier for IRENX-ai, especially in TypeScript-heavy development, but it must be treated as a tool, not a substitute for engineering responsibility.

All AI-assisted code must be:
- reviewed by a human
- consistent with repository patterns
- validated with tests and tooling
- secure by default
- explainable and maintainable

This repository should use Copilot to move faster without lowering engineering standards.

---

## 9. Useful references
- GitHub Copilot documentation
- repository test and lint tooling
- repo coding standards and architecture patterns
- internal PR review and deployment policies
