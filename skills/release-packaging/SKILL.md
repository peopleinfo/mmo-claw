---
name: release-packaging
description: Build signing, auto-update, and cross-platform packaging pipelines. Use for release readiness and distribution workflows.
---

# release-packaging

## Inputs
- Target OS matrix and signing requirements.
- Release channels (`stable`, `beta`, optional `nightly`).

## Workflow
1. Configure packaging for Windows, macOS, and Linux with explicit artifact names.
2. Separate build-time secrets from runtime config and keep signing material external.
3. Implement auto-update strategy per channel with rollback capability.
4. Define CI release workflow: build, sign, checksum, publish metadata, publish artifacts.
5. Add install/uninstall smoke checks for each target OS.
6. Generate release notes from commit history or changelog source.
7. Gate release by build/test success and artifact verification.

## Validation
- Produce artifacts for each target OS in CI.
- Verify checksums and signature validity where applicable.
- Validate update metadata references published artifacts.

## Done Criteria
- Reproducible release pipeline.
- Signed artifacts and update feeds are consistent.
- Rollback path is documented and testable.
