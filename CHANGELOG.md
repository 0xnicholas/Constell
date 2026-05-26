# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
