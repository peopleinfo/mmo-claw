---
name: ipc-contracts
description: Define and enforce typed IPC contracts between Electron main and renderer. Use when adding or changing cross-process APIs.
---

# ipc-contracts

## Inputs
- New or changed cross-process capability.
- Expected request/response and event payload shapes.

## Workflow
1. Add channel contract and payload types in `packages/ipc` before touching handlers.
2. Expose preload API from typed contract only; block direct raw channel usage.
3. Implement main handler with runtime validation for untrusted payloads.
4. Implement renderer caller using generated/typed wrappers.
5. Preserve backward compatibility for existing channels when possible.
6. Add error contract with stable error codes instead of free-form messages.
7. Update docs/changelog for contract additions or breaking changes.

## Validation
- Type-check main, preload, and renderer packages.
- Add contract tests for success and failure payloads.
- Confirm no string literal channel calls remain in changed files.

## Done Criteria
- IPC changes are fully typed and validated.
- Handler and caller stay in sync.
- Contract evolution is explicit and reviewable.
