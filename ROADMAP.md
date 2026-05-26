# Constell Roadmap

> Lightweight open-source LLM observability platform. Core mission: reliable tracing, prompt management, and metrics — without operational complexity.

---

## Architecture at a Glance

```
Client SDK ──► web (Next.js, port 3000) ──► Redis (BullMQ) ──► worker (Express, port 3030)
                  │                                              │
                  ▼                                              ▼
           PostgreSQL (metadata)                          ClickHouse (events)
                  │                                              │
                  └────────────────── MinIO / S3 ────────────────┘
```

- **Stack**: Node.js 26, pnpm, Turbo, Next.js (Pages Router), tRPC, Prisma, ClickHouse, BullMQ + Redis
- **Ingestion**: async by default — web ACKs, worker writes
- **OLTP** (PostgreSQL): mutable metadata, auth, config
- **OLAP** (ClickHouse): immutable wide events via `ReplacingMergeTree(event_ts)`

---

## Release Plan

### v0.1.0-alpha — Skeleton

**Goal**: `git clone && pnpm run dx` works in < 5 minutes.

| Deliverable                                | Owner               | Notes                                         |
| ------------------------------------------ | ------------------- | --------------------------------------------- |
| Monorepo skeleton (Turbo + pnpm workspace) | root                | `web`, `worker`, `packages/shared`, `ee`      |
| Docker Compose dev stack                   | root                | Postgres 17, ClickHouse 25, Redis 7.2, MinIO  |
| Toolchain                                  | root                | ESLint, Prettier, Husky, Conventional Commits |
| CI skeleton                                | `.github/workflows` | PR title validation, lint, typecheck          |
| AGENTS.md hierarchy                        | root + packages     | Already done                                  |

**Exit**: `pnpm run lint && pnpm run typecheck` passes on empty packages.

---

### v0.2.0-alpha — Infrastructure

**Goal**: All shared infrastructure is wired and tested.

| Deliverable                    | Key File                                                         | Notes                                                                              |
| ------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Prisma schema + migrations     | `packages/shared/prisma/schema.prisma`                           | `User`, `Org`, `Project`, `ApiKey`, `Trace`, `Observation`, `Prompt`, `ModelPrice` |
| ClickHouse schema + migrations | `packages/shared/clickhouse/migrations/`                         | `observations_wide`, `traces_wide` — `ReplacingMergeTree`                          |
| `@constell/shared` exports     | `src/index.ts`, `src/server/index.ts`, `src/db.ts`, `src/env.ts` | frontend-safe barrier enforced                                                     |
| BaseError hierarchy            | `packages/shared/src/errors/`                                    | Shared between tRPC and REST                                                       |
| Auth (NextAuth + API Key)      | `web/src/pages/api/auth/[...nextauth].ts`                        | `Basic` auth for API keys                                                          |
| tRPC scaffold                  | `web/src/server/api/trpc.ts`, `root.ts`                          | Context with `projectId`, middleware chain                                         |
| BullMQ queue contracts         | `packages/shared/src/server/queues.ts`                           | `ingestion-queue`, `blobstorage-queue`, `prompt-cache-queue`                       |
| Worker skeleton                | `worker/src/app.ts`, `workerManager.ts`                          | Express boot, env gating, graceful shutdown                                        |
| Healthcheck endpoints          | `web/src/pages/api/health.ts`, `worker/src/app.ts`               | PG + CH + Redis connectivity                                                       |
| Vitest config per package      | each `package.json`                                              | Unit + integration test infrastructure                                             |

**Exit**: All healthchecks pass; empty test suites run green.

---

### v0.3.0-alpha — Tracing

**Goal**: First user-visible feature — send a trace, see it in the UI.

| Deliverable         | File                                      | Notes                                            |
| ------------------- | ----------------------------------------- | ------------------------------------------------ |
| Ingestion API       | `web/src/pages/api/public/ingestion.ts`   | Validates, enqueues, returns `batchId`           |
| Ingestion processor | `worker/src/queues/ingestionProcessor.ts` | Deep validation, cost calc, dual write (CH + PG) |
| Python SDK          | `sdk/python/`                             | `@constell.observe()`, `constell.trace()`        |
| TypeScript SDK      | `sdk/typescript/`                         | Same surface as Python                           |
| Trace list page     | `web/src/pages/traces/index.tsx`          | Table, time range filter, pagination             |
| Trace detail page   | `web/src/pages/traces/[id].tsx`           | Span tree, input/output, metadata                |
| tRPC trace router   | `web/src/server/api/routers/traces.ts`    | CH query for list; PG+CH for detail              |
| Rate limiting       | middleware                                | 1000 events/min per API key, token bucket        |

**Exit**: SDK sends trace → ingestion API → worker writes → UI shows trace with span tree.

---

### v0.4.0-alpha — Prompt Management

**Goal**: Versioned prompts, client-side cache, UI editor.

| Deliverable           | File                                    | Notes                                                       |
| --------------------- | --------------------------------------- | ----------------------------------------------------------- |
| Prompt CRUD tRPC      | `web/src/server/api/routers/prompts.ts` | Create, list, get by version/label                          |
| Prompt editor UI      | `web/src/pages/prompts/[name].tsx`      | Code editor + live preview                                  |
| Prompt version labels | `PromptVersionLabel` table              | `latest`, `production` etc.                                 |
| SDK prompt fetch      | `get_prompt()`                          | Server cache (Redis, 60s TTL) + client fallback             |
| Prompt usage linkage  | ingestion pipeline                      | Auto-associate `generation` observation with prompt version |
| Public API routes     | `/api/public/prompts/*`                 | `GET`, `POST`, `POST /:name/versions`                       |

**Exit**: Create prompt in UI → SDK fetches latest version → use in code → trace shows prompt version.

---

### v0.5.0-beta — Metrics & Analytics

**Goal**: Cost, latency, token usage dashboards.

| Deliverable             | File                                    | Notes                                     |
| ----------------------- | --------------------------------------- | ----------------------------------------- |
| ClickHouse aggregations | CH materialized views or queries        | Daily/hourly rollups                      |
| Dashboard page          | `web/src/pages/dashboard.tsx`           | KPI cards, trend charts                   |
| Cost calculation        | `worker/src/services/costCalculator.ts` | `ModelPrice` lookup, per-observation cost |
| Metrics API             | tRPC + REST                             | Time-bounded, project-scoped              |
| Export                  | `blobStorageProcessor`                  | JSON Lines to MinIO/S3                    |

**Exit**: Dashboard shows accurate total cost, P95 latency, token usage trends.

---

### v1.0.0 — Stable

**Goal**: Production-ready self-host.

| Deliverable                 | Notes                                      |
| --------------------------- | ------------------------------------------ |
| Helm Chart                  | K8s deployment with HPA                    |
| Terraform templates         | AWS, GCP, Azure one-click deploy           |
| Observability               | Self-tracing (dogfooding), structured logs |
| Documentation site          | Docusaurus/Nextra                          |
| Python + TS SDK on PyPI/npm | Published, versioned                       |
| API docs                    | Fern-generated                             |
| Security audit              | OWASP top 10 checklist                     |
| Load testing                | 10k events/s sustained                     |

---

## Post-v1.0 (Future)

| Feature                           | Why After v1.0                          |
| --------------------------------- | --------------------------------------- |
| Evaluations (LLM-as-a-Judge)      | Needs tracing + prompts stable first    |
| Datasets & regression experiments | Needs eval infrastructure               |
| LLM Playground                    | Needs prompt rendering + model API keys |
| OpenAI SDK auto-wrap              | Needs stable tracing contract           |
| LangChain / LlamaIndex callbacks  | Needs SDK ecosystem                     |
| Real-time alerts                  | Needs metrics pipeline mature           |
| Multi-region                      | Needs cloud-hosted offering             |

---

## Decision Log

| Decision                                  | Context                           | Status    |
| ----------------------------------------- | --------------------------------- | --------- |
| Node.js 26 over 24                        | 24 EOL April 2027                 | ✅ Frozen |
| Pages Router over App Router              | Langfuse proven pattern           | ✅ Frozen |
| Basic auth for API keys                   | Bearer can't carry both pk+sk     | ✅ Frozen |
| ReplacingMergeTree over MergeTree         | Idempotent writes required        | ✅ Frozen |
| Mutable metadata in PG, immutable in CH   | ClickHouse doesn't support UPDATE | ✅ Frozen |
| `POST /prompts/:name/versions` over `PUT` | REST semantics                    | ✅ Frozen |
| Only 2 SDKs (Python + TS) for v1.0        | 80% of LLM ecosystem              | ✅ Frozen |

---

## Current Status

**Released**: `v0.3.0-alpha` — Tracing end-to-end (SDK → Ingestion → Worker → UI) is complete.

**Next**: Implement **v0.4.0-alpha — Prompt Management**. See `docs/superpowers/plans/` for upcoming plans.
