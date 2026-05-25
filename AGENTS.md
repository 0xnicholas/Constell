# Agent Guidelines for Constell

Constell is an open source LLM engineering platform for developing, monitoring,
evaluating, and debugging AI applications. It is architecturally aligned with
Langfuse and optimized for high-scale observability on wide, structured event
data.

## Maintenance Contract

- `AGENTS.md` is a living document.
- Keep this file concise and router-like. Push narrow or conditional workflows
  into package-local `AGENTS.md` files or shared skills under `.agents/skills/`.
- Update this file in the same PR when monorepo-level architecture, workflows,
  dependency boundaries, mandatory verification commands, or release/security
  processes materially change.
- Treat developer interactions as a learning loop: when work reveals a durable
  repo convention, recurring pitfall, reusable workflow, or verification pattern,
  update the smallest relevant context surface in the same PR.
- For package-local material changes, update the nearest package `AGENTS.md` in
  the same PR.

## Start Here By Task

- Architecture principles for high-scale observability and wide event data:
  `.agents/ARCHITECTURE_PRINCIPLES.md`
- Repo-wide agent setup, `.agents/**`, provider shims, or MCP/bootstrap config:
  `.agents/README.md`
- Backend/API work in `web/src/server/**`, `web/src/pages/api/public/**`,
  `worker/src/**`, or `packages/shared/src/**`:
  `packages/shared/AGENTS.md` and package-local guides
- Web UI and frontend entry points: `web/AGENTS.md`
- Worker queues and processors: `worker/AGENTS.md`
- Shared contracts, exports, schema, and migrations: `packages/shared/AGENTS.md`
- EE-only work: `ee/AGENTS.md`

Read the minimal set required for the task. More-specific package guides take
precedence over this root file for their scoped areas.

## Project Structure

```text
Constell/
├─ web/                     # Next.js app (UI + tRPC + public REST)
├─ worker/                  # Queue consumers and background processing
├─ packages/shared/         # Shared domain, DB, queue contracts, repositories
├─ ee/                      # Enterprise package consumed by web
├─ generated/               # Generated API clients (do not hand-edit)
├─ fern/                    # API definition sources
└─ scripts/                 # Repo scripts
```

- Dependency direction:
  - `web` -> `@constell/shared`, `@constell/ee`
  - `worker` -> `@constell/shared`
  - `@constell/ee` -> `@constell/shared`
  - `@constell/shared` -> no imports from `web`, `worker`, or `ee`
- Queue payload schemas and queue-name contracts are owned by
  `packages/shared/src/server/queues.ts`.
- High-signal shared entry points:
  - Domain models: `packages/shared/src/domain/{observations,traces,scores}.ts`
  - Postgres schema: `packages/shared/prisma/schema.prisma`
  - ClickHouse migrations:
    `packages/shared/clickhouse/migrations/{clustered,unclustered}/*.sql`

## Technology Stack

| Layer           | Technology                          |
| --------------- | ----------------------------------- |
| Runtime         | Node.js 24                          |
| Package Manager | pnpm                                |
| Monorepo        | Turbo                               |
| Web App         | Next.js (Pages Router), React, tRPC |
| Styling         | Tailwind CSS, shadcn/ui             |
| Database (OLTP) | PostgreSQL (Prisma ORM)             |
| Database (OLAP) | ClickHouse                          |
| Queue           | BullMQ on Redis                     |
| Object Storage  | MinIO / S3-compatible               |
| API Spec        | Fern                                |
| Testing         | Vitest, Playwright                  |
| Auth            | NextAuth.js                         |

## Core Commands

- Install deps: `pnpm install`
- Dev all packages: `pnpm run dev`
- Dev web only: `pnpm run dev:web`
- Dev worker only: `pnpm run dev:worker`
- Lint all: `pnpm run lint`
- Typecheck all: `pnpm run typecheck` / `pnpm tc`
- Build check: `pnpm run build:check`
- Full build: `pnpm run build`
- Full reset/bootstrap (destructive): `pnpm run dx`
- Infra up: `pnpm run infra:dev:up`
- Infra down: `pnpm run infra:dev:down`

### Minimum Verification Matrix

| Change scope                                                                                                | Minimum verification                                                                                 |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `web/**` only                                                                                               | `pnpm --filter web run lint` + targeted web tests                                                    |
| `worker/**` only                                                                                            | `pnpm --filter worker run lint` + targeted worker tests                                              |
| `packages/shared/**` (non-schema)                                                                           | `pnpm --filter @constell/shared run lint` + one targeted web check + one targeted worker check       |
| `packages/shared/prisma/**` or `packages/shared/clickhouse/**`                                              | `pnpm --filter @constell/shared run lint` + `pnpm run db:generate` + targeted web/worker regressions |
| Public API contract (`web/src/pages/api/public/**`, `web/src/features/public-api/types/**`, `fern/apis/**`) | web lint + targeted server API tests + Fern update/regeneration; never hand-edit `generated/**`      |
| Cross-package refactor (`web` + `worker` + `shared`)                                                        | `pnpm run lint` + `pnpm run typecheck` + targeted tests per impacted package                         |

## Repo Rules

- Keep changes scoped; avoid unrelated refactors.
- Prefer package-local implementation details in package `AGENTS.md` files.
- Do not hand-edit generated/build artifacts:
  - `generated/*`
  - `web/.next/*`
  - `web/.next-check/*`
  - `*/dist/*`
  - `packages/shared/prisma/generated/*`
- Public API contract changes must update Fern sources in `fern/apis/**` and
  regenerated outputs. Never hand-edit `generated/**`.
- Before adding constants, value lists, or display mappings, search for an
  existing owner and reuse or extend that source of truth.
- Keep tests independent and parallel-safe.
- For bug fixes, write the failing test first, confirm it fails, then fix the
  bug.
- For user-visible frontend changes in `web/**`, review the affected flow in a
  real browser with Playwright before signoff.
- Never commit secrets or credentials. Keep `.env*.example` files in sync with
  required env vars.

## Shared Agent Setup

- `.agents/AGENTS.md` is the canonical root guide (if `.agents/` exists).
- Root `AGENTS.md` is the primary discovery file.
- Shared agent/tool config lives in `.agents/config.json` and shared skills
  live in `.agents/skills/`.
- When creating or editing `.agents/skills/**`, keep skills concise with
  progressive disclosure and update `.agents/skills/README.md`.
- Durable cross-tool guidance belongs in root/package `AGENTS.md` files or
  `.agents/skills/**`, not only in tool-specific config directories.

## Commit, PR, and Release Rules

- Commit messages and PR titles must follow Conventional Commits:
  `type(scope): description` or `type: description`.
- In PR descriptions, list impacted packages and executed verification commands.
- Release workflow is managed at root with `pnpm run release`.
- Do not change release/versioning flow without updating this file and impacted
  package guides.

## Git and Tooling Notes

- Use `gh search issues` for GitHub issue search.
- Do not use destructive git commands such as `reset --hard` unless explicitly
  requested.
- Do not revert unrelated working-tree changes.
- Keep commits focused and atomic.

## Development Environment

### Quick Start (Docker Compose)

```bash
# Clone and enter repo
git clone <repo-url>
cd Constell

# Install dependencies
pnpm install

# Start infrastructure (Postgres, ClickHouse, Redis, MinIO)
pnpm run infra:dev:up

# Reset databases and seed examples
pnpm --filter=shared run db:reset
pnpm --filter=shared run ch:reset
pnpm --filter=shared run db:seed:examples

# Start development servers
pnpm run dev
```

### One-Command Bootstrap (Destructive)

```bash
pnpm run dx
```

This runs the full reset: install deps, prune & restart infra, reset DBs,
seed examples, and start dev servers.

### Environment Variables

Copy `.env.dev.example` to `.env` and fill in required values:

- `DATABASE_URL` — PostgreSQL connection
- `CLICKHOUSE_URL` — ClickHouse HTTP endpoint
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_AUTH` — Redis configuration
- `SALT` — application salt
- `ENCRYPTION_KEY` — 32-byte hex key for secret encryption
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET` — authentication
- `CONSTELL_S3_EVENT_UPLOAD_*` — S3/MinIO event upload config
- `CONSTELL_S3_MEDIA_UPLOAD_*` — S3/MinIO media upload config

## Architecture Overview

### Ingestion Flow

```
Client SDKs / API
       │
       ▼
  web (Next.js) ──► Redis Queue (BullMQ)
       │                    │
       ▼                    ▼
   Postgres            worker processors
   (metadata)               │
       │                    ▼
       └────────────► ClickHouse (events)
                            │
                            ▼
                        S3 / MinIO (blobs)
```

### Design Principles

- **Wide Events First**: Model observations as the primary analytical unit. A
  trace is a correlation handle, not the only entry point.
- **Immutable Events**: Prefer append-oriented event records. Updates that force
  read-time deduplication create hidden query costs at scale.
- **Columnar Access**: Design storage and query paths around columnar patterns:
  narrow field selection, time-bounded scans, useful ordering keys, and data pruning.
- **Scale-Aware APIs**: Require time windows, expose field selection, use token
  pagination, and avoid defaults that can scan all history.
- **Operational Simplicity**: Extra databases, queues, materialized views, and
  migrations must earn their long-term operational burden.

See `.agents/ARCHITECTURE_PRINCIPLES.md` for the full principles document.

## Package Guidelines

### `web/`

- Next.js application with Pages Router.
- tRPC for internal API; public REST routes under `src/pages/api/public/*`.
- Feature-based code organization under `src/features/<feature>/*`.
- Reusable UI components under `src/components/*`.
- shadcn/ui primitives from `src/components/ui`.
- Tailwind is the default styling layer.

### `worker/`

- Express + BullMQ background job processor.
- Queue handlers idempotent where possible.
- Env-flag gating in `src/app.ts` for new consumers.
- Queue payload parsing centralized in shared contracts.

### `packages/shared/`

- Shared domain, database, queue, and server utilities.
- Primary owner of Postgres schema, ClickHouse schema, and queue contracts.
- Export entry points:
  - `@constell/shared` — cross-runtime types, schemas, domain models
  - `@constell/shared/src/server` — server-only backend services
  - `@constell/shared/src/db` — Prisma client (never in frontend bundles)
  - `@constell/shared/src/env` — validated environment schema

### `ee/`

- Enterprise Edition package consumed by `web` and `worker`.
- Keep EE-only concerns isolated from OSS package code paths.
- Depends on `@constell/shared`; coordinate shared type changes carefully.

## Testing

- **Server tests**: `*.servertest.ts` — integration tests requiring Postgres
- **Server unit tests**: `src/__tests__/server/unit/*.servertest.ts` — pure unit tests, no DB
- **Client tests**: `*.clienttest.ts(x)` — frontend/component tests
- **E2E tests**: Playwright under `src/__e2e__/*`
- **In-source tests**: Vitest colocated tests for small utilities

Run tests per package:

```bash
pnpm --filter web run test -- <pattern>
pnpm --filter web run test-client -- <pattern>
pnpm --filter web run test:e2e
pnpm --filter worker run test -- <pattern>
```

## Security

- Never commit secrets or credentials.
- Encrypt sensitive data at rest using `@constell/shared/encryption`.
- Validate all public API inputs with strict Zod schemas.
- Use RBAC patterns from `web/src/features/rbac/`.

## Documentation

- Public-facing docs live in a sibling repo (e.g., `constell-docs`).
- API documentation is generated from Fern definitions in `fern/apis/**`.
- Changelog entries follow the format in `content/changelog/` (if docs repo exists).
