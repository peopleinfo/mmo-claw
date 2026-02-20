---
name: team-auth-casdoor
description: Implement team role model with Casdoor SSO and role policies. Use for multi-user access control and permission boundaries.
---

# team-auth-casdoor

## Inputs
- Casdoor tenant/app configuration.
- Team roles and permission matrix.

## Workflow
1. Implement Casdoor OIDC login flow with PKCE for desktop/web contexts.
2. Map Casdoor identity claims to internal team/member records.
3. Enforce RBAC in both API handlers and renderer route guards.
4. Store refresh/session secrets in OS keychain and avoid plaintext token storage.
5. Implement session renewal and explicit logout/revocation handling.
6. Add audit events for login, role change, denied access, and admin actions.
7. Keep auth adapter isolated so IdP can be swapped with minimal changes.

## Validation
- Verify login/logout flow for admin, editor, viewer.
- Verify unauthorized actions return deterministic errors.
- Verify token refresh and expired-session handling.

## Done Criteria
- SSO works with Casdoor end to end.
- Role-based restrictions are enforced consistently.
- Authentication behavior is observable and test-covered.
