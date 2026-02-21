# Bundled uv Binaries

This folder stores the packaged `uv` runtime binaries used by `@mmo-claw/uvx-manager`.

Expected artifacts:

- `uv` for Linux/macOS
- `uv.exe` for Windows

During local bootstrap, placeholders are created by `pnpm run bundle:uv`.
Release packaging must replace placeholders with platform-specific binaries.
