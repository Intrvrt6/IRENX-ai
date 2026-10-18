# GitHub Copilot: Quick Guide for IRENX-ai

## Use Copilot for
- writing TypeScript types and interfaces
- generating tests for new features
- scaffolding repeated code patterns
- explaining code and debugging logic
- creating initial refactor drafts

## Do not rely on Copilot for
- final security decisions
- production code merge approval
- access control or auth logic without review
- architecture or policy decisions
- code you cannot explain

## Best practices
- be specific with the prompt
- include file paths and types
- request tests and edge cases
- keep prompts small and focused
- validate before accepting output

## Required validation
- review generated code before merge
- run relevant unit tests
- type-check the project
- check linting and formatting
- review auth, validation, and dependency changes

## Security policy
- treat Copilot output as a draft
- check for secret leaks and unsafe dependencies
- confirm authorization and validation are correct
- review all new external calls and config changes

## Example prompt
> Generate a TypeScript function in `src/...` that accepts `[input]` and returns `[output]`. Include validation, null handling, and tests for success, invalid input, and edge cases.

## Final rule
Copilot speeds up delivery. Engineers remain responsible for correctness, safety, and review.
