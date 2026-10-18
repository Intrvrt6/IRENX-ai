# Backend Prompt Templates (TypeScript / Node / API)

## 1) API route or service function
> Implement a TypeScript function in `[path]` that accepts `[input type]` and returns `[output type]`. Validate required fields, preserve the current error semantics, and handle `null`, `undefined`, and invalid data gracefully. Add unit tests for success, invalid input, and edge cases.

## 2) Express / Node / API controller
> Create a TypeScript controller for `[route]` that validates request data, handles auth checks, and returns consistent error responses. Use existing project patterns and include tests for valid requests, unauthorized calls, and malformed payloads.

## 3) Backend data layer
> Add a TypeScript repository or service method that fetches `[records]` by `[filters]`. Return typed results, handle missing records cleanly, and include tests for empty results, single-result cases, and error handling.

## 4) Security review
> Review this TypeScript backend code for security issues. Focus on validation, auth, permissions, secret handling, and external calls. Identify the likely risks in order of severity and suggest minimal patches.
