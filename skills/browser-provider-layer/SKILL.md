---
name: browser-provider-layer
description: Implement browser provider abstraction with Camoufox and stealth engines, fingerprinting, and proxy assignment. Use for anti-detect runtime concerns.
---

# browser-provider-layer

## Inputs
- Supported providers (`camoufox`, `playwright-stealth`, `puppeteer-stealth`, optional vanilla).
- Profile and proxy data contract.

## Workflow
1. Define a single  interface for launch, context creation, and teardown.
2. Implement provider adapters and map actor requirements to provider selection.
3. Inject profile fingerprint settings and proxy assignment at context creation time.
4. Enforce per-run session isolation (cookies, local storage, temp profile dirs).
5. Add retry, timeout, and crash recovery hooks for unstable target websites.
6. Record provider-level telemetry: startup time, failures, and blocked attempts.
7. Keep provider-specific flags centralized to avoid inconsistent stealth behavior.

## Validation
- Run one smoke flow per provider with a trivial page action.
- Verify proxy assignment actually routes traffic.
- Verify context cleanup removes session artifacts.

## Done Criteria
- Actor can request a provider by capability, not implementation detail.
- Fingerprint + proxy wiring is deterministic.
- Provider failures surface clear diagnostics.
