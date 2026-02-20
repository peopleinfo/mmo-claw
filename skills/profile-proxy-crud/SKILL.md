---
name: profile-proxy-crud
description: Implement profile, proxy, and account CRUD with assignment and validation flows. Use for profile management and proxy operations.
---

# profile-proxy-crud

## Inputs
- Profile fields, proxy fields, and account linkage rules.
- Validation rules for proxy format and assignment constraints.

## Workflow
1. Build typed CRUD endpoints/repos for profiles, proxies, and account links.
2. Enforce data validation at input boundary and database boundary.
3. Implement assignment workflow () with uniqueness/rotation policy.
4. Add proxy test action and persist latency/status results.
5. Implement UI forms with optimistic updates plus rollback on server rejection.
6. Add filtering/search for large lists to keep operations fast.
7. Add activity logs for create/update/delete/assignment actions.

## Validation
- Test create/update/delete paths for each entity.
- Test invalid proxy/auth inputs and duplicate assignments.
- Verify proxy test results are visible in UI and persisted.

## Done Criteria
- CRUD flows are complete and resilient.
- Assignment behavior is deterministic.
- UI and DB state remain consistent after failures.
