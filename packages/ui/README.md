# @mmo-claw/ui

Shared UI component library for the MMO Claw desktop application.

## Contribution Guidelines & Guardrails 🚨

To ensure consistency and long-term maintainability, this project enforces a **shadcn-first** policy for additions to `packages/ui`.

### Rules

1. **Use generated shadcn primitives:** If a component exists in the shadcn/radix ecosystem (e.g., Dialog, Checkbox, Tabs), you must use the shadcn-based generator or paste the shadcn reference code into `src/components`.
2. **Do not hand-rewrite standard primitives:** Bespoke implementations of common components (like hand-rolling a custom Dropdown using nested divs and manual state) are strictly forbidden if a Radix/shadcn equivalent exists.
3. **Use `cn` and `cva` for styling:** Component variants should be constructed using `class-variance-authority` and merged via the local `cn` utility (which uses `clsx` and `tailwind-merge`). Avoid raw string concatenation for `className`.
4. **Export everything publicly:** All primitives must be exported from `src/index.ts` to allow downstream consumers to import them without reaching into internal paths.

### Automated Checks

A guardrail script (`pnpm run guard`) is included to perform basic heuristic validations on the codebase. It ensures, for example, that the `cn()` utility is imported when `className` is mapped, discouraging manual string-merged classes that stray from the architecture.

Ensure that the guard script and smoke test `pnpm run test` pass locally before committing.
