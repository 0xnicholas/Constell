# Agent Guidelines for `web`

This file covers package-local guidance for this package.
Use root [AGENTS.md](../AGENTS.md) for monorepo-level rules.

## Purpose

- Next.js application with UI, tRPC backend, and public REST API routes.
- Check `web/package.json` for current Next.js, React, and tRPC versions before
  version-sensitive work.
- Primary package for frontend and most request/response surface changes.

## Maintenance Contract

- `AGENTS.md` is a living document.
- Update this file in the same PR when material web-local changes occur:
  - new/renamed web entry points
  - new API route families
  - changed web-specific verification commands
- If the change also affects monorepo workflows or other packages, update root
  `AGENTS.md` too.

## High-Signal Entry Points

- App shell/providers: `src/pages/_app.tsx`
- tRPC context/procedures: `src/server/api/trpc.ts`
- tRPC router registry: `src/server/api/root.ts`
- tRPC routers: `src/server/api/routers/*`, `src/features/*/server/*`
- Public REST API routes: `src/pages/api/public/*`
- Feature modules: `src/features/*`
- Reusable UI components: `src/components/*`
- Tests:
  - Server integration tests: `src/__tests__/server/*.servertest.ts`
  - Server unit tests: `src/__tests__/server/unit/*.servertest.ts`
  - Client tests: `src/**/*.clienttest.ts(x)`
  - E2E: `src/__e2e__/*`

## Shared Package Imports

- Prefer `@constell/shared` in frontend-safe web code for shared types, zod
  schemas, domain contracts, table definitions, prompt/eval/model-pricing
  helpers, and other cross-runtime utilities.
- Use `@constell/shared/src/server` only from server-only web code such as
  `src/server/**`, `src/pages/api/**`, and server tests.
- Use `@constell/shared/src/db` only in backend or test code that needs direct
  Prisma access; never route it into client bundles.
- Use narrower subpaths such as `@constell/shared/src/env` or
  `@constell/shared/encryption` only when that focused surface is the clearest
  dependency.
- See `../packages/shared/AGENTS.md` for the full shared export map and what
  each entrypoint contains.

## Web Conventions

- Put net-new feature code under `src/features/<feature>/*`; put broadly reusable
  components under `src/components/*`.
- We use tRPC for full-stack web features; register routers in
  `src/server/api/root.ts`.
- Prefer Shadcn/ui primitives from `src/components/ui`; if a missing component
  must be installed, ask the user before doing so.
- Tailwind is the default styling layer; use the shared palette and globals in
  `src/styles/globals.css`.
- When changing shared UI/table patterns, update sibling variants consistently,
  including default-visible and hidden columns or states.
- For component style variants, prefer `cva` with `VariantProps` and merge
  caller classes through `cn`, following existing `src/components/ui/*`
  components:

  ```tsx
  const cardVariants = cva("rounded-md border", {
    variants: {
      intent: { default: "bg-background", error: "border-destructive" },
    },
    defaultVariants: { intent: "default" },
  });

  type CardProps = React.HTMLAttributes<HTMLDivElement> &
    VariantProps<typeof cardVariants>;

  const className = cn(cardVariants({ intent }), props.className);
  ```

- When anchoring sticky, fixed, or absolute elements to the viewport, use
  `top-banner-offset`, `pt-banner-offset`, `h-screen-with-banner`, or
  `min-h-screen-with-banner` instead of raw `top-0` so banners do not overlap
  the UI.
- Public API routes should use middleware patterns from
  `src/features/public-api/server/withMiddlewares.ts`, define strict request and
  response types in `src/features/public-api/types/*`, add server tests, and
  update Fern sources when the contract changes.
- Keep tests independent; in `src/__tests__/server/**`, prefer scoped cleanup or
  unique test data over global reset helpers.
- Put pure server unit tests that do not need Postgres bootstrap under
  `src/__tests__/server/unit/**` so they skip the shared DB setup hook.
- For small utility functions, prefer Vitest in-source tests when colocated
  coverage is the simplest option, especially when the test needs access to
  private implementation details without widening the module API.
- Do not extract private utility functions into separate files only to make
  them testable. Keep them local unless the user explicitly asks for extraction
  or the utility is meaningfully reused.

## Quick Commands

- Dev: `pnpm --filter web run dev`
- Lint: `pnpm --filter web run lint`
- Lint fix: `pnpm --filter web run lint:fix`
- Typecheck: `pnpm --filter web run typecheck`
- Server tests: `pnpm --filter web run test -- <args>`
- In-source tests: `pnpm --filter web run test:in-source -- <args>`
- Client tests: `pnpm --filter web run test-client -- <args>`
- E2E tests: `pnpm --filter web run test:e2e`
- Build: `pnpm --filter web run build`

## Playbooks

### Add/Change tRPC endpoint

1. Implement router/procedure in `src/server/api/routers/*` or
   `src/features/<feature>/server/*`.
2. Register in `src/server/api/root.ts`.
3. Reuse auth/error patterns from `src/server/api/trpc.ts`.
4. Add/adjust server tests under `src/__tests__/server/*`.

### Add/Change public API endpoint

1. Add route in `src/pages/api/public/*`.
2. Define/update contract types in `src/features/public-api/types/*`.
3. Add/adjust server tests in `src/__tests__/server/*`.
4. If API contract changed, update Fern source (`../fern/apis/**`) and regenerate
   outputs (do not hand-edit `../generated/**`).

### Error handling (tRPC + REST)

1. Throw `BaseError` subclasses (eg `NotFoundError`) from handlers and services.
2. Let `BaseError`s bubble up to the tRPC and REST middlewares (eg. don't `try/catch` and rethrow into `TRPCError` in the handler).
3. Extend `BaseError` or its subclasses in `packages/shared/src/errors/` as needed.

### Add frontend feature

1. Prefer `src/features/<feature>/*` for feature-local code.
2. Put broadly reusable components in `src/components/*`.
3. Keep server logic near feature server folders when possible.
4. Review the affected user flow in a real browser with Playwright before signoff.

## Package-Specific Rules

- Router style is Pages Router-centric; follow existing routing patterns.
- In `src/pages`, do not keep both `foo.ts(x)` and a `foo/` folder. If the
  folder exists, put the route implementation in `foo/index.ts(x)` instead.
- Keep tests independent; no reliance on test execution order.
- Confirm the target `*.clienttest.*` or `*.servertest.*` file exists before passing a pattern to `vitest run`; source files do not always have a matching colocated test file.
- When passing a Vitest file or pattern through `pnpm --filter web ...`, make it
  relative to `web/` because the script runs with `web` as the working
  directory. Example: use `src/features/widgets/chart-library/BigNumber.tsx`,
  not `web/src/features/widgets/chart-library/BigNumber.tsx`.
- Prefer separate test files for components, integration coverage, and broader
  behaviors; use Vitest in-source tests mainly for small-scoped utilities.
- Run Vitest in-source utility coverage with `pnpm --filter web run test:in-source`;
  do not try to target these through `test-client` or by assuming a separate
  `*.clienttest.*`/`*.servertest.*` file exists.
- Do not hand-edit build artifacts: `.next/*`, `.next-check/*`, `dist/*`.
