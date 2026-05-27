# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.8.0-beta] - 2026-05-27

### Added

- **Annotation Queues (Team Manual Labeling)**
  - AnnotationQueue Prisma model: named queues linked to ScoreConfig
  - AnnotationQueueItem Prisma model: trace items with status (PENDING/ASSIGNED/ANNOTATED/REVIEWED)
  - ScoreSource enum extended with ANNOTATION
  - tRPC `annotations` router: queueList/queueCreate/queueDelete/queuePopulate, itemList/itemAssign/itemAnnotate/itemReview, myAssignments, queueStats
  - RBAC: itemAssign/itemReview require ADMIN/OWNER role via membership check
  - `/annotations/queues` page: queue CRUD with item counts
  - `/annotations/queues/[id]` page: queue detail with stats bar, item table with bulk assign
  - `/annotations/work` page: annotator workbench showing trace detail + score input panel
  - Annotation creates Score record with `source=ANNOTATION`, reusable across all score infrastructure
  - Review flow: approve → REVIEWED, reject → back to ASSIGNED with score deleted

## [0.7.0-beta] - 2026-05-27

### Added

- **Evaluations (LLM-as-a-Judge Pipeline)**
  - EvalTemplate Prisma model: prompt template, output schema, score mapping, model config
  - EvalRun Prisma model: status tracking (PENDING/RUNNING/COMPLETED/FAILED/CANCELLED), progress, summary
  - Worker `evalProcessor`: fetches traces from ClickHouse, calls LLM API, parses structured output, writes EVAL scores
  - LLM API client: OpenAI-compatible chat completions via native fetch
  - Output parser: JSON path extraction with markdown code block support, number/boolean/string fallbacks
  - tRPC `evals` router: `templateList`, `templateCreate`, `templateDelete`, `runList`, `runCreate`, `runDetail`, `runCancel`
  - Eval queue: `eval-queue` (BullMQ) with `EvalJob` contract
  - `/evals/templates` page: CRUD for eval templates with prompt variable hints
  - `/evals/runs` page: create runs with template/time-range selection, list with status/progress
  - `/evals/runs/[id]` page: run detail with error inspection and score link
  - Eval scores write to existing `Score` model with `source=EVAL` (immutable, reuse all score infrastructure)

## [0.6.0-beta] - 2026-05-27

### Added

- **Scores (Lightweight Scoring System)**
  - Score config CRUD (`ScoreConfig` Prisma model): name, dataType (NUMERIC/BOOLEAN/CATEGORICAL), min/max
  - Score CRUD (`Score` Prisma model): attach to trace/observation, value/stringValue, source (API/UI/EVAL)
  - Ingestion pipeline `score-create` event type: validates trace existence, writes to PG + CH
  - tRPC `scores` router: `configList`, `configCreate`, `configUpdate`, `configDelete`, `list`, `create`, `update`, `delete`, `analytics`
  - Public REST API: `/api/public/scores`, `/api/public/scores/:id`, `/api/public/score-configs`
  - Score list page (`/scores`) with pagination
  - Score config page (`/scores/configs`) with create/delete
  - Trace detail enhancement: ScoreCards showing attached scores
  - Dashboard enhancement: Score KPIs and dimension selector
  - TypeScript SDK: `client.score()` method
  - Python SDK: `client.score()` method
  - ClickHouse `scores_wide` table for query-time analytics

## [0.5.0-beta] - 2026-05-27

### Added

- **Metrics & Analytics**
  - Metrics dashboard (`/dashboard`) with KPI cards, cost trends (CSS bar chart), and model breakdown table
  - tRPC `metrics` router: `summary` (KPI cards), `trends` (time series with auto granularity), `modelBreakdown` (per-model usage), `export` (async batch export)
  - Empty-range handling: `metrics.summary` returns all zeros (no `NaN`) via `zeroSummary()`
  - Trends auto-granularity: `hour` for ≤48h ranges, `day` otherwise; rejects explicit granularities producing >90 buckets with `400`
  - Async batch export pipeline via dedicated `export-queue` (BullMQ)
  - Worker `exportProcessor`: streams ClickHouse rows, transforms to JSONL/CSV, uploads to S3/MinIO
  - Worker `exportWriter`: presigned S3 URLs with 24h TTL via `@aws-sdk/s3-request-presigner`
  - Redis backup for completed exports (`export-result:{jobId}`, 24h TTL) to survive BullMQ retention cleanup
  - REST endpoint `GET /api/public/exports/:jobId` — dual auth (session or API key), returns `404` for cross-project access (enumeration-safe)
  - `metrics.export` returns `503` when `CONSTELL_S3_BATCH_EXPORT_ENABLED` is not `true`
  - ModelPrice seed script (`packages/shared/prisma/seed/modelPrices.ts`) with 6 common LLMs (gpt-4o, claude-3.5-sonnet, gemini-1.5-pro, etc.)
  - Server unit tests: `zeroSummary` returns all zeros; `metrics.export` throws 503 when S3 disabled

## [0.4.0-alpha] - 2026-05-27

### Added

- **Prompt Management**
  - Prisma migration: `promptName` and `promptVersion` fields on `Observation` model
  - ClickHouse migration: `prompt_name` and `prompt_version` columns on `observations_wide`
  - Redis prompt cache layer (`packages/shared/src/server/promptCache.ts`) with 60s TTL
  - tRPC `prompts` router: `list`, `create`, `detail`, `createVersion`, `setLabel`, `getByLabel` (cache-aware)
  - Prompt list page (`/prompts`) with create form
  - Prompt editor page (`/prompts/[name]`) with version history and label management
  - Public API: `GET /api/public/prompts/:name?version=...` and `POST /api/public/prompts`
  - Worker prompt cache consumer for cache invalidation via `prompt-cache-queue`
  - TypeScript SDK: `client.getPrompt(name, label?)`
  - Python SDK: `client.get_prompt(name, label="latest")`
  - Ingestion pipeline auto-linkage: `observation-create` accepts `promptName`/`promptVersion`, worker writes to PG + CH

## [0.3.0-alpha] - 2026-05-26

### Added

- **Ingestion Pipeline**
  - Langfuse-style event batch schema: `trace-create`, `observation-create` with Zod validation
  - Deep validation with cross-reference checks (observation → trace)
  - Event enrichment: latency calculation, token aggregation, timestamp normalization
  - Worker ingestion processor: 6-phase pipeline (validate → dedupe → cross-ref → enrich → PG → CH)
  - Cost calculator: `ModelPrice` lookup with per-token cost computation
  - ClickHouse batch writer: buffered `JSONEachRow` insert for `traces_wide` + `observations_wide`
  - Failure handling: per-event skip + report, batch continues on partial failure

- **Shared Ingestion Contracts**
  - `packages/shared/src/server/ingestion/types.ts` — Event types + `ProcessingFailure`
  - `packages/shared/src/server/ingestion/schemas.ts` — Zod schemas with 7 unit tests
  - `packages/shared/src/server/ingestion/validation.ts` — Shallow + cross-reference validation with 5 tests
  - `packages/shared/src/server/ingestion/enrichment.ts` — Latency/token/timestamp enrichment with 3 tests

- **Web Ingestion API**
  - Shallow batch validation using shared Zod schema before enqueue
  - Returns `400` with validation details on malformed batch

### Changed

- Worker ingestion worker now uses real `processIngestionJob` instead of placeholder
- `@constell/shared/src/server` barrel exports ingestion modules

- **Trace Query & UI (Phase B)**
  - tRPC `traces` router: `list` (ClickHouse `traces_wide`) and `detail` (PostgreSQL + observations)
  - Trace list page (`/traces`) with time range filter and offset pagination
  - Trace detail page (`/traces/[id]`) with observation span tree, input/output preview
  - tRPC Next.js client (`web/src/utils/api.ts`) with superjson transformer

- **Rate Limiting (Phase B)**
  - Fixed-window counter rate limiter (1000 events/min per API key) backed by Redis
  - Returns `429` with `retryAfter` when exceeded

- **SDKs (Phase B)**
  - Python SDK (`sdk/python/`): `ConstellClient`, `Trace`, `Observation`, `Usage`
  - TypeScript SDK (`sdk/typescript/`): same surface, native `fetch`, batch flush loop

- **Session & Project Resolution (Phase C)**
  - NextAuth JWT callback enriches session with user's first `projectId`
  - tRPC context resolves `projectId` from session or API key
  - `useActiveProject` hook for session / URL query param fallback
  - Trace list/detail pages use real `projectId` instead of hardcoded value

- **E2E Verification (Phase C)**
  - `scripts/e2e-smoke.ts` — manual smoke test: SDK → ingestion → worker → tRPC → UI

### Fixed

- Worker trace aggregate computation now writes real values (total tokens, cost, latency) instead of zeros
- SSR `useSession` undefined handling in trace pages

## [0.2.0-alpha] - 2026-05-26

### Added

- **Database Layer**
  - Full Prisma schema with models for `User`, `Account`, `Session`, `Organization`, `Membership`, `Project`, `ApiKey`, `Trace`, `Observation`, `ModelPrice`, `Prompt`, `PromptVersion`, `PromptVersionLabel`
  - Prisma client singleton at `@constell/shared/src/db`
  - Initial Prisma migration (`20260526045636_init`)
  - ClickHouse schema migrations: `observations_wide` and `traces_wide` using `ReplacingMergeTree`

- **Shared Infrastructure**
  - `BaseError` hierarchy with typed status codes for tRPC/REST error handling
  - Validated environment schema via Zod (`parseEnv`)
  - Encryption helpers (`hashSecret`, `compareSecret`) via bcryptjs
  - BullMQ queue contracts: `ingestion-queue`, `blobstorage-queue`, `prompt-cache-queue`
  - ClickHouse client singleton with lazy initialization (`getClickHouseClient`)

- **Worker (Port 3030)**
  - Express app with `/health` endpoint (checks Postgres, ClickHouse, Redis)
  - BullMQ worker skeleton with `createBullMQWorkers()` and `closeWorkers()`
  - Graceful shutdown on SIGTERM/SIGINT (HTTP server → workers → Prisma disconnect)

- **Web Auth & API**
  - NextAuth v4 with Prisma adapter and JWT session strategy
  - API Key authentication via `Authorization: Basic <base64(pk:sk)>`
  - tRPC scaffold with `createTRPCContext` (session + API key dual auth)
  - `authedProcedure` middleware enforcing session or API key
  - Public ingestion endpoint `POST /api/public/ingestion` — validates API key and enqueues to BullMQ with retry/backoff
  - Healthcheck endpoint `GET /api/health` (checks Postgres, ClickHouse)

- **Tooling**
  - Vitest configs for `packages/shared`, `web`, and `worker`
  - Placeholder tests for all three packages

### Changed

- Bumped package versions from `0.1.0-alpha` to `0.2.0-alpha`

### Fixed

- Downgraded NextAuth from v5 beta to v4 for Pages Router compatibility
- Removed server-only bcryptjs from frontend-safe `@constell/shared` barrel
- Changed `BlobStorageJob.payload` from `Buffer` to `string` (base64) for JSON serialization
- Made ClickHouse client lazy to avoid `parseEnv` crash on module import
- Made BullMQ Redis connections lazy to avoid connection hang at module load
- Fixed worker graceful shutdown to properly await async cleanup
- Fixed boolean env vars to return actual `boolean` instead of `"true" | "false"` strings
- Added `eslint.ignoreDuringBuilds` in Next.js config (temporary until ESLint setup)

## [0.1.0-alpha] - 2026-05-25

### Added

- Monorepo skeleton with pnpm workspace + Turbo
- Packages: `web`, `worker`, `packages/shared`, `ee`
- Docker Compose dev stack (Postgres 17, ClickHouse 25, Redis 7.2, MinIO)
- CI workflows: lint, typecheck, PR title validation
- Husky + lint-staged + Prettier + Conventional Commits
- `AGENTS.md` hierarchy for agentic development
