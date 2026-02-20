---
name: telegram-control-flow
description: Implement Telegram command routing, authorization, and run-status messaging for remote actor control. Use for Telegram-driven operations.
---

# telegram-control-flow

## Inputs
- Bot token and allowed team/user mapping.
- Command patterns and actor mapping rules.

## Workflow
1. Define command grammar and intent mapping to actor actions.
2. Authenticate sender against allowed team/member rules before execution.
3. Enqueue actor run request with full context (team, profile, proxy, actor input).
4. Stream progress updates back to Telegram with concise state changes.
5. Attach completion artifacts (screenshot/log snippet/run id) to result message.
6. Handle duplicate commands idempotently using dedupe key and time window.
7. Implement error responses with clear retry guidance and operator escalation path.

## Validation
- Test authorized and unauthorized command execution.
- Test duplicate command handling.
- Test success and failure notifications include run references.

## Done Criteria
- Telegram can trigger and monitor actor runs safely.
- Access control and dedupe protections are enforced.
- Operational status is visible remotely.
