---
name: actor-kit
description: Scaffold and implement actor modules with input schema, runtime wrapper, and logging contracts. Use for new automation actors.
---

# actor-kit

## Inputs
- Actor objective and target platform.
- Input schema fields and validation rules.

## Workflow
1. Scaffold actor folder with , runtime entry point, and skill wrapper.
2. Define strict input schema defaults and validation constraints.
3. Implement actor execution with explicit run phases: setup, auth, action, verify, finalize.
4. Emit structured run logs and attach screenshot/artifact references when applicable.
5. Register actor metadata so UI forms can render from schema.
6. Add retry strategy only for transient failures; fail fast on auth/policy failures.
7. Provide deterministic output contract (`status`, `summary`, `artifacts`, `errors`).

## Validation
- Validate schema parsing and default behavior.
- Execute a dry-run/smoke run with mock credentials.
- Confirm failure path records actionable logs.

## Done Criteria
- Actor is installable, runnable, and observable end to end.
- UI can configure actor inputs without hardcoded forms.
- Runtime output is stable for downstream automation.
