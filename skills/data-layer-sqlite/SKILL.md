---
name: data-layer-sqlite
description: Design and implement local-first SQLite schema, queries, and migrations. Use for persistence and repository data contracts.
---

# data-layer-sqlite

## Inputs
- Table entities and relationships from `project-prd.md`.
- Query paths required by UI and runtime services.

## Workflow
1. Define schema and constraints first, then implement query modules per bounded context.
2. Use forward-only migrations with deterministic ordering.
3. Enforce referential integrity and unique constraints for team/profile/proxy mappings.
4. Add typed repository methods instead of ad hoc inline SQL usage.
5. Wrap multi-step writes in transactions and define rollback behavior.
6. Add seed/dev fixture helpers for local testing without production coupling.
7. Version schema changes and document migration impact.

## Validation
- Run migration from empty DB to latest.
- Run migration on existing DB snapshot.
- Verify key queries for profiles, proxies, runs, and schedules.

## Done Criteria
- Schema supports all current features without manual patching.
- Migration pipeline is repeatable.
- Query layer is typed and testable.
