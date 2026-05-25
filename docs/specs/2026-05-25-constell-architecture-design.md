# Constell Architecture Design Spec

**Version:** 0.2.0  
**Date:** 2026-05-25  
**Status:** Reviewed  
**Scope:** Phases 0–1 (Repo Skeleton + Core Architecture), with extension points for Phases 2–4

---

## 1. Overview

Constell is a **lightweight open-source LLM engineering platform** optimized for teams who need reliable observability without operational complexity. It provides **Tracing**, **Prompt Management**, and **Metrics & Analytics** as core features, with a roadmap for future expansion.

### 1.1 Design Goals

| Goal                         | Description                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Operational Simplicity**   | Run on 2 databases (PostgreSQL + ClickHouse) + Redis + MinIO. Single-node Docker Compose for development; Kubernetes-ready for production. |
| **High-Scale Observability** | Ingest 10k+ events/second per node via immutable wide events in ClickHouse.                                                                |
| **Developer Experience**     | `pnpm run dx` → full dev env in < 5 minutes. SDKs with zero-config defaults.                                                               |
| **Open Core**                | MIT-licensed core with clean EE separation.                                                                                                |

### 1.2 Non-Goals (Phase 1)

- Evaluations (LLM-as-a-judge, manual labeling)
- Datasets & regression experiments
- LLM Playground
- Multi-region deployments
- Real-time alerting / PagerDuty integration

These are **Phase 5+** or **post-MVP** features, explicitly excluded to maintain focus.

### 1.3 Key Constraints

### 1.4 Performance Targets

| Metric                  | Target                  | Baseline Hardware                         |
| ----------------------- | ----------------------- | ----------------------------------------- |
| Ingestion throughput    | 10,000 events/second    | 4 vCPU, 8GB RAM, SSD (single-node Docker) |
| API latency (p99)       | < 100ms                 | Same                                      |
| Trace list query        | < 500ms (90-day window) | Same                                      |
| ClickHouse batch insert | 1,000 rows or 1s flush  | Same                                      |

These targets assume warm caches and default retention (90 days). Production deployments with dedicated hardware and ClickHouse clustering will exceed these numbers.

- **Node.js 26** runtime across all packages (Active LTS). Node.js 24 reaches Maintenance LTS end-of-life in April 2027; Constell targets the current Active LTS at launch.
- **pnpm** + **Turbo** monorepo. No yarn/npm.
- **Pages Router** (not App Router) for Next.js — aligned with Langfuse's proven pattern.
- **No GraphQL** — tRPC for internal, REST for public API.

---

## 2. System Architecture

### 2.1 High-Level Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                     │
│  │ Python   │  │ TS/JS    │  │ OpenAI   │  │ LangChain│  (Future: Go, Java)│
│  │ SDK      │  │ SDK      │  │ Wrapper  │  │ Callback │                     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘                     │
└───────┼─────────────┼─────────────┼─────────────┼───────────────────────────┘
        │             │             │             │
        └─────────────┴──────┬──────┴─────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Ingress Layer                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Next.js (web) — Port 3000                                           │   │
│  │  ├─ tRPC routers (internal API)                                      │   │
│  │  ├─ Public REST API (`/api/public/*`)                                │   │
│  │  ├─ NextAuth.js (session + API key auth)                             │   │
│  │  └─ React UI (Tailwind + shadcn/ui)                                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Queue Layer                                     │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Redis + BullMQ                                                      │   │
│  │  ├─ ingestion-queue       (event batch processing)                   │   │
│  │  ├─ blobstorage-queue     (export to S3/MinIO)                       │   │
│  │  ├─ prompt-cache-queue    (invalidate prompt client cache)           │   │
│  │  └─ (reserved: metrics-agg-queue)                                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Worker Layer (Port 3030)                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Express + BullMQ Workers                                            │   │
│  │  ├─ IngestionProcessor      (parse → validate → write)               │   │
│  │  ├─ BlobStorageProcessor    (batch export to S3)                     │   │
│  │  └─ (reserved: MetricsAggregator, PromptCacheWarmer)                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
        │                                    │
        ▼                                    ▼
┌──────────────────────┐          ┌─────────────────────────────────────────┐
│   OLTP Store         │          │   OLAP Store                            │
│   PostgreSQL 17      │          │   ClickHouse 25.x                       │
│   ├─ users           │          │   ├─ events (raw ingestion)             │
│   ├─ organizations   │          │   ├─ observations_wide                  │
│   ├─ projects        │          │   ├─ traces_wide                        │
│   ├─ api_keys        │          │   ├─ scores (future)                    │
│   ├─ prompts (+versions)│       │   └─ metrics_aggregated (MV, future)    │
│   ├─ traces (metadata)│         │                                         │
│   └─ observations (metadata)│   │                                         │
└──────────────────────┘          └─────────────────────────────────────────┘
        │
        ▼
┌──────────────────────┐
│   Object Storage     │
│   MinIO / S3         │
│   ├─ events/         │
│   ├─ media/          │
│   └─ exports/        │
└──────────────────────┘
```

### 2.2 Data Flow — Ingestion

```
SDK / API Client
    │
    ▼ POST /api/public/ingestion
┌─────────────┐
│  web (Next) │  ──► 1. Validate API key (PostgreSQL)
│  Ingestion  │  ──► 2. Basic payload validation (Zod)
│  Handler    │  ──► 3. Enqueue to Redis (BullMQ)
└─────────────┘         ingestion-queue
    │
    ▼
┌─────────────┐
│   Worker    │  ──► 4. Dequeue batch
│  Ingestion  │  ──► 5. Deep validation + enrichment
│  Processor  │  ──► 6. Write to ClickHouse (async batch insert)
└─────────────┘     ──► 7. Upsert metadata to PostgreSQL (Prisma)
```

**Key Design Decision:** The ingestion path is **asynchronous by default**. The web handler ACKs immediately after enqueuing; the worker handles heavy lifting. This prevents API latency from being coupled to write throughput.

### 2.3 Data Flow — Query

```
User opens Trace List in UI
    │
    ▼ tRPC call
┌─────────────┐
│  web (Next) │  ──► 1. Auth check (session or API key)
│   tRPC      │  ──► 2. Build ClickHouse query (time-bounded, project-scoped)
│  Router     │  ──► 3. Execute via ClickHouse HTTP client
└─────────────┘     ──► 4. Merge with PostgreSQL metadata (if needed)
    │
    ▼
  React UI renders table
```

**Key Design Decision:** List/aggregate views hit **ClickHouse only**. Detail views (single trace) may join with PostgreSQL for metadata richness, but this is the exception, not the rule.

---

### 2.4 Redis Multi-Purpose Usage

Redis serves multiple roles beyond BullMQ queues:

| Role                    | Key Pattern                    | TTL       |
| ----------------------- | ------------------------------ | --------- |
| **BullMQ Queues**       | `bull:ingestion-queue:*`       | Job TTL   |
| **Session Store**       | `next-auth.session-token:*`    | 30 days   |
| **Prompt Client Cache** | `prompt:v2:{projectId}:{name}` | 60s       |
| **API Rate Limit**      | `ratelimit:{apiKeyHash}`       | 1 min     |
| **Pub/Sub**             | `events:{projectId}`           | Real-time |

Session store uses Redis by default for NextAuth.js in self-hosted mode.

## 3. Technology Stack & Rationale

| Layer                 | Technology                | Alternative Considered         | Rationale                                                                                                                                  |
| --------------------- | ------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Runtime               | Node.js 26                | Node.js 24, Deno               | Active LTS alignment; 26 provides improved native fetch, V8 performance, and security hardening over 24.                                   |
| Package Manager       | pnpm 11.x                 | yarn, npm                      | Workspace + lockfile consistency; `only-allow` enforcement.                                                                                |
| Monorepo Orchestrator | Turbo 2.x                 | Nx, Lage                       | Simpler config; excellent incremental build caching; Langfuse proven.                                                                      |
| Web Framework         | Next.js 15 (Pages Router) | Remix, Nuxt                    | Pages Router is battle-tested for this pattern; Langfuse's entire UI is built on it. App Router migration is a future option, not Phase 1. |
| API (Internal)        | tRPC 11                   | GraphQL, gRPC                  | Type-safe end-to-end; colocated with Next.js; zero codegen for internal use.                                                               |
| API (Public)          | REST + OpenAPI/Fern       | GraphQL                        | SDK-friendly; Fern generates typed clients automatically.                                                                                  |
| Auth                  | NextAuth.js 5 (Auth.js)   | Clerk, Supabase Auth           | Self-hostable; no vendor lock-in; API key auth is custom-built on top.                                                                     |
| Styling               | Tailwind CSS 4            | CSS Modules, Styled Components | Utility-first scales well with shadcn/ui; tree-shakes unused styles.                                                                       |
| UI Components         | shadcn/ui + Radix         | Material UI, Chakra            | Copy-paste ownership; no runtime dependency; fully customizable.                                                                           |
| ORM                   | Prisma 6                  | Drizzle, TypeORM               | Mature migration system; excellent TypeScript DX; Langfuse codebase already uses it heavily.                                               |
| OLTP Database         | PostgreSQL 17             | MySQL 8, CockroachDB           | JSONB support; excellent Prisma compatibility; proven at scale.                                                                            |
| OLAP Database         | ClickHouse 25.x           | TimescaleDB, Apache Druid      | Columnar storage optimized for wide events; sub-second aggregation on billions of rows; Langfuse's production backbone.                    |
| Queue                 | BullMQ 5 + Redis 7.2      | RabbitMQ, SQS                  | Redis is already required for session/cache; BullMQ has excellent retry/dead-letter semantics.                                             |
| Object Storage        | MinIO (dev) / S3 (prod)   | Local filesystem, GCS          | S3-compatible API is the standard; MinIO provides identical API for dev.                                                                   |
| Testing               | Vitest + Playwright       | Jest, Cypress                  | Vitest is faster with native ESM; Playwright for cross-browser E2E.                                                                        |
| API Spec              | Fern                      | OpenAPI Generator, Swagger     | First-class TypeScript/Python SDK generation; docs site generation.                                                                        |

---

## 4. Monorepo Package Design

### 4.1 Package Graph

```
                    ┌─────────────┐
                    │   @constell/│
                    │    shared   │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │     web     │ │    worker   │ │     ee      │
    │   (Next.js) │ │  (Express)  │ │  (enterprise)│
    └─────────────┘ └─────────────┘ └─────────────┘
```

**Dependency Rules (enforced by ESLint + manual review):**

```
web ──────► @constell/shared, @constell/ee
worker ───► @constell/shared
@constell/ee ──► @constell/shared
@constell/shared ──► (no imports from web, worker, or ee)
```

### 4.2 Package Responsibilities

#### `@constell/shared`

The **kernel** of the system. Everything that `web` and `worker` both need lives here.

| Subpath                       | Contents                                                                                                             | Consumers                       |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `@constell/shared`            | Cross-runtime types, Zod schemas, domain models, constants                                                           | `web` (client-safe), `worker`   |
| `@constell/shared/src/server` | Server-only barrel: repositories, queue contracts, Redis/ClickHouse helpers, auth helpers, logger, ingestion helpers | `web` (server code), `worker`   |
| `@constell/shared/src/db`     | Prisma client singleton + Prisma namespace/types                                                                     | `web` (server), `worker`, tests |
| `@constell/shared/src/env`    | Validated environment schema (Zod)                                                                                   | `web`, `worker`, scripts        |
| `@constell/shared/encryption` | Encryption/signature helpers                                                                                         | `web`, `worker`                 |

**Critical Rule:** `src/index.ts` must remain **frontend-safe**. Never import server-only modules (Prisma, Redis, ClickHouse clients) into the root barrel.

#### `web`

Next.js application. Dual-purpose:

1. **UI Server** — React pages, tRPC endpoints, SSR
2. **Public API Gateway** — REST routes under `/api/public/*`

**Directory Conventions:**

```
web/src/
├── pages/                    # Next.js Pages Router
│   ├── _app.tsx             # App shell, providers, global styles
│   ├── api/public/          # Public REST API routes
│   │   ├── ingestion.ts     # Event ingestion endpoint
│   │   ├── traces/
│   │   ├── observations/
│   │   └── prompts/
│   └── [feature]/           # Page routes
├── server/
│   └── api/
│       ├── trpc.ts          # tRPC context, middleware, error formatter
│       ├── root.ts          # Router registry
│       └── routers/         # tRPC route handlers
├── features/
│   └── <feature>/           # Feature-based modules
│       ├── components/      # Feature-local UI
│       ├── server/          # Feature-local tRPC routers
│       └── hooks/           # Feature-local React hooks
├── components/
│   └── ui/                  # shadcn/ui primitives
├── lib/
│   └── utils.ts             # cn(), formatters, etc.
└── styles/
    └── globals.css          # Tailwind directives + CSS variables
```

#### `worker`

Express + BullMQ background processor.

```
worker/src/
├── app.ts                    # Express app init, worker registration, env gating
├── queues/
│   ├── workerManager.ts      # Worker lifecycle, concurrency, metrics
│   ├── ingestionProcessor.ts # Main ingestion pipeline
│   └── blobStorageProcessor.ts
├── features/
│   └── <feature>/            # Feature-specific processors
├── services/
│   └── <service>.ts          # Shared business logic
└── __tests__/
    └── *.test.ts
```

#### `ee`

Enterprise Edition. Clean separation from OSS code.

```
ee/src/
├── index.ts                  # Public EE exports
├── env.ts                    # EE-specific env vars
└── ee-license-check/
    └── index.ts              # License validation logic
```

**Build-time gating:** The OSS build excludes `ee/` entirely. The EE build includes it and `@constell/ee` is consumed by `web` and `worker`.

---

## 5. Database Design

### 5.1 PostgreSQL (OLTP) — Schema Overview

**Role:** Metadata, configuration, auth, and relational data.

```prisma
// prisma/schema.prisma (simplified)

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Auth & Identity ───
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  id            String    @id @default(cuid())
  email         String?   @unique
  emailVerified DateTime?
  name          String?
  image         String?
  accounts      Account[]
  sessions      Session[]
  memberships   Membership[]
  apiKeys       ApiKey[]
  createdAt     DateTime  @default(now())
}

// ─── Organization & Project ───
model Organization {
  id          String      @id @default(cuid())
  name        String
  projects    Project[]
  memberships Membership[]
  createdAt   DateTime    @default(now())
}

model Membership {
  id             String       @id @default(cuid())
  userId         String
  organizationId String
  role           MembershipRole @default(OWNER)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([userId, organizationId])
}

enum MembershipRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}

model Project {
  id             String       @id @default(cuid())
  name           String
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  apiKeys        ApiKey[]
  traces         Trace[]
  prompts        Prompt[]
  createdAt      DateTime     @default(now())
}

// ─── API Authentication ───
model ApiKey {
  id          String    @id @default(cuid())
  publicKey   String    @unique // pk-xxx
  hashedSecretKey String // bcrypt of sk-xxx
  displayName String?
  projectId   String
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now())
  lastUsedAt  DateTime?
  expiresAt   DateTime?
}

// ─── Tracing Metadata ───
model Trace {
  id          String        @id @default(cuid())
  externalId  String?       // user-provided trace ID
  projectId   String
  project     Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name        String?
  userId      String?       // end-user ID from SDK
  sessionId   String?       // session correlation
  metadata    Json?         // Prisma JSONB
  release     String?
  version     String?
  tags        String[]
  bookmarked  Boolean       @default(false)
  public      Boolean       @default(false)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  // Computed aggregates (updated by worker)
  totalTokens Int?
  totalCost   Decimal?      @db.Decimal(65, 30)
  latencyMs   Int?

  observations Observation[]

  @@unique([projectId, externalId])
  @@index([projectId, createdAt])
  @@index([projectId, sessionId])
  @@index([projectId, userId])
}

model Observation {
  id          String   @id @default(cuid())
  traceId     String
  trace       Trace    @relation(fields: [traceId], references: [id], onDelete: Cascade)
  projectId   String
  type        String   // 'SPAN', 'GENERATION', 'EVENT'
  name        String?
  startTime   DateTime?
  endTime     DateTime?
  model       String?
  input       String?  @db.Text
  output      String?  @db.Text
  inputTokens Int?
  outputTokens Int?
  totalTokens Int?
  calculatedCost Decimal? @db.Decimal(65, 30)
  level       String   @default("DEFAULT")
  statusMessage String?
  metadata    Json?
  parentObservationId String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([projectId, traceId])
  @@index([projectId, createdAt])
}

// ─── Model Pricing ───
model ModelPrice {
  id            String    @id @default(cuid())
  model         String    @unique
  inputPrice    Decimal   @db.Decimal(65, 30) // per 1M tokens
  outputPrice   Decimal   @db.Decimal(65, 30) // per 1M tokens
  currency      String    @default("USD")
  effectiveFrom DateTime  @default(now())
  effectiveTo   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

// ─── Prompt Management ───
model Prompt {
  id          String        @id @default(cuid())
  projectId   String
  project     Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name        String
  versions    PromptVersion[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@unique([projectId, name])
}

model PromptVersion {
  id          String   @id @default(cuid())
  promptId    String
  prompt      Prompt   @relation(fields: [promptId], references: [id], onDelete: Cascade)
  version     Int
  content     String   @db.Text
  config      Json?    // model params, temperature, etc.
  labels      PromptVersionLabel[]
  createdBy   String?  // user ID
  createdAt   DateTime @default(now())

  @@unique([promptId, version])
}

model PromptVersionLabel {
  id              String @id @default(cuid())
  promptVersionId String
  label           String // e.g., "latest", "production"
  promptVersion   PromptVersion @relation(fields: [promptVersionId], references: [id], onDelete: Cascade)

  @@unique([promptVersionId, label])
}
```

### 5.2 ClickHouse (OLAP) — Schema Overview

**Role:** Immutable wide events for observability and analytics.

**Design Principles:**

1. **Immutable events only** in ClickHouse. User-mutable metadata (`bookmarked`, `tags`, `name`) lives in PostgreSQL.
2. **ReplacingMergeTree** for idempotent writes. Deduplication key = `id`; version column = `event_ts`.
3. **One wide table per entity.** No joins at query time for OLAP paths.

```sql
-- observations_wide — immutable observation events
CREATE TABLE observations_wide (
    id UUID,
    trace_id UUID,
    project_id UUID,
    type String,           -- 'SPAN', 'GENERATION', 'EVENT'
    name String,
    start_time DateTime64(3),
    end_time DateTime64(3),
    latency_ms UInt32,

    -- Input / Output
    input String,
    output String,

    -- Model info (for GENERATION type)
    model String,
    model_parameters String, -- JSON

    -- Usage
    input_tokens UInt32,
    output_tokens UInt32,
    total_tokens UInt32,
    calculated_cost Decimal64(12),

    -- Level / Status
    level String,          -- 'DEBUG', 'DEFAULT', 'WARNING', 'ERROR'
    status_message String,

    -- Immutable context (write-once)
    environment String,
    release String,
    version String,
    session_id String,
    user_id String,
    metadata String,       -- JSON string

    -- Parent-child hierarchy
    parent_observation_id Nullable(UUID),

    -- Deduplication
    event_ts DateTime64(3), -- version column for ReplacingMergeTree
    ingested_at DateTime64(3) DEFAULT now(),

    -- Ordering / Sharding
    INDEX idx_trace_id trace_id TYPE bloom_filter GRANULARITY 3,
    INDEX idx_project_id project_id TYPE bloom_filter GRANULARITY 3,
)
ENGINE = ReplacingMergeTree(event_ts)
PARTITION BY toYYYYMMDD(ingested_at)
ORDER BY (project_id, toDate(ingested_at), trace_id, start_time, id)
TTL ingested_at + INTERVAL 90 DAY;

-- traces_wide — immutable trace aggregate snapshot
-- Mutable fields (name, tags, bookmarked, public) are NOT stored here.
-- They are fetched from PostgreSQL at query time for list views.
CREATE TABLE traces_wide (
    id UUID,
    project_id UUID,
    user_id Nullable(String),
    session_id Nullable(String),
    release Nullable(String),
    version Nullable(String),

    -- Immutable aggregates (updated by worker when new observations arrive)
    total_tokens UInt32 DEFAULT 0,
    total_cost Decimal64(12) DEFAULT 0,
    latency_ms UInt32 DEFAULT 0,
    observation_count UInt32 DEFAULT 0,
    has_error UInt8 DEFAULT 0,

    created_at DateTime64(3),
    updated_at DateTime64(3), -- from PostgreSQL trace.updatedAt
    event_ts DateTime64(3),   -- version column
    ingested_at DateTime64(3) DEFAULT now(),

    INDEX idx_project_id project_id TYPE bloom_filter GRANULARITY 3,
)
ENGINE = ReplacingMergeTree(event_ts)
PARTITION BY toYYYYMMDD(ingested_at)
ORDER BY (project_id, toDate(ingested_at), created_at, id)
TTL ingested_at + INTERVAL 90 DAY;
```

**Mutable vs Immutable Data Boundary:**

| Data Type                              | Store                          | Reason                           |
| -------------------------------------- | ------------------------------ | -------------------------------- |
| `bookmarked`, `tags`, `public`, `name` | PostgreSQL                     | User-editable via UI             |
| `total_tokens`, `latency`, `cost`      | ClickHouse `traces_wide`       | Immutable aggregates from worker |
| Raw observation events                 | ClickHouse `observations_wide` | Immutable wide events            |

List queries join PostgreSQL metadata + ClickHouse aggregates on `trace.id`. Detail views read `observations_wide` directly.

### 5.3 Data Retention & Lifecycle

| Store                 | Default Retention | Strategy                                             |
| --------------------- | ----------------- | ---------------------------------------------------- |
| PostgreSQL            | Indefinite        | Prune old trace metadata via scheduled job (Phase 4) |
| ClickHouse raw        | 90 days           | ClickHouse TTL                                       |
| ClickHouse aggregated | 1 year            | Materialized views or separate aggregation table     |
| MinIO events          | 30 days           | Lifecycle policy                                     |

---

## 6. API Architecture

### 6.1 Authentication

Two auth modes, mutually exclusive per request:

| Mode        | Header                                         | Use Case                  |
| ----------- | ---------------------------------------------- | ------------------------- |
| **Session** | Cookie (`next-auth.session-token`)             | Web UI interactions       |
| **API Key** | `Authorization: Basic <base64(pk-xxx:sk-xxx)>` | SDK / programmatic access |

API Key validation:

```
1. Parse `Authorization: Basic <credentials>` header
2. Base64 decode to `publicKey:secretKey` pair
3. Lookup `ApiKey` by publicKey in PostgreSQL
4. bcrypt.compare(secretKey, hashedSecretKey)
5. Attach `projectId` to request context
```

### 6.2 Public REST API

Base path: `/api/public/v1/`

```
POST   /api/public/ingestion           # Batch event ingestion
GET    /api/public/traces              # List traces
GET    /api/public/traces/:id          # Get trace detail
GET    /api/public/observations        # List observations
GET    /api/public/observations/:id    # Get observation detail

# Prompt Management (Phase 3)
GET    /api/public/prompts             # List prompts
GET    /api/public/prompts/:name       # Get prompt (latest or by version)
POST   /api/public/prompts             # Create prompt
POST   /api/public/prompts/:name/versions  # Create new version
```

**Request/Response Contract:** Strict Zod schemas. Never use `any`. All timestamps are ISO 8601 strings.

### 6.3 Internal tRPC API

Used by the React UI. Not exposed externally.

```
# Example routers
trace.list        -> ClickHouse query
trace.byId        -> ClickHouse + PostgreSQL join
prompt.list       -> PostgreSQL
prompt.create     -> PostgreSQL + cache invalidation
metrics.dashboard -> ClickHouse aggregation
```

### 6.4 Fern Integration

API spec lives in `fern/apis/v1/`. Fern generates:

1. **OpenAPI spec** → `generated/openapi.json`
2. **TypeScript SDK** → `generated/typescript/`
3. **Python SDK** → `generated/python/`
4. **Documentation** → docs site

**Rule:** Never hand-edit `generated/**`. Always edit Fern source and regenerate.

---

## 7. Ingestion Pipeline Design

### 7.1 Event Batch Format

```json
{
  "batch": [
    {
      "id": "obs_001",
      "type": "trace-create",
      "timestamp": "2026-05-25T12:00:00.000Z",
      "body": {
        "id": "trace_001",
        "name": "chat-completion",
        "metadata": { "source": "web-chat" }
      }
    },
    {
      "id": "obs_002",
      "type": "observation-create",
      "timestamp": "2026-05-25T12:00:01.000Z",
      "body": {
        "id": "gen_001",
        "traceId": "trace_001",
        "type": "GENERATION",
        "name": "gpt-4o-call",
        "input": "What is the capital of France?",
        "output": "Paris",
        "model": "gpt-4o",
        "usage": { "input": 10, "output": 2, "total": 12 }
      }
    }
  ]
}
```

### 7.2 Processing Stages

```
Stage 1: API Gateway (web)
  └─ Rate limiting: token bucket, per API key
      ├─ Capacity: 1000 events/min
      ├─ Refill rate: 1000 events/min
      └─ Burst: 200 events
  └─ Payload size limit (1MB)
  └─ Payload size limit (1MB)
  └─ Zod schema validation (shallow)
  └─ Enqueue to BullMQ

Stage 2: Queue (Redis + BullMQ)
  └─ Durability: Redis AOF + RDB
  └─ Retry: 3 attempts with exponential backoff
  └─ Dead letter: failed events to `ingestion-failed` queue

Stage 3: Worker Processor
  └─ Deep validation (cross-reference trace IDs)
  └─ Enrichment (calculate cost from model pricing table)
  └─ Idempotent write:
      ├─ ClickHouse: ReplacingMergeTree deduplicates by (id, event_ts)
      ├─ PostgreSQL: ON CONFLICT (id) DO NOTHING for Observation; ON CONFLICT (projectId, externalId) DO NOTHING for Trace
      └─ Stable idempotency key = event.body.id (user-provided trace/observation ID)
  └─ Batch write to ClickHouse (async, 1000 rows/batch or 1s flush)
  └─ Upsert metadata to PostgreSQL (Prisma, idempotent)
  └─ Update `traces_wide` aggregates (background, eventually consistent)
```

### 7.3 Idempotency Guarantees

Constell guarantees at-least-once delivery with idempotent writes:

| Store       | Strategy                     | Key                               |
| ----------- | ---------------------------- | --------------------------------- |
| ClickHouse  | ReplacingMergeTree(event_ts) | id + event_ts                     |
| PostgreSQL  | ON CONFLICT ... DO NOTHING   | id or (projectId, externalId)     |
| Redis Queue | BullMQ deduplication         | event.body.id within 5-min window |

SDKs retry on network errors with exponential backoff. The server accepts duplicate events gracefully.

### 7.4 Backpressure Handling

| Scenario               | Behavior                                                              |
| ---------------------- | --------------------------------------------------------------------- |
| Queue depth < 1000     | Normal processing                                                     |
| Queue depth 1000–10000 | Increase worker concurrency                                           |
| Queue depth > 10000    | API gateway returns `429 Too Many Requests` with `Retry-After` header |
| Worker crash           | BullMQ retries; dead-letter after max attempts                        |

---

## 8. Security Architecture

### 8.1 Threat Model — Phase 1 Priorities

| Threat                            | Mitigation                                                 |
| --------------------------------- | ---------------------------------------------------------- |
| API key theft / leakage           | Keys are hashed (bcrypt); never logged; revocable          |
| SQL injection                     | Prisma ORM (parameterized queries only)                    |
| NoSQL/ClickHouse injection        | ClickHouse HTTP client with parameterized queries          |
| XSS                               | React escapes by default; CSP headers in Next.js config    |
| CSRF                              | SameSite cookies; API key auth is stateless                |
| Data exfiltration (cross-project) | All queries filtered by `project_id` from auth context     |
| SSRF                              | Allowlist for outbound URLs (model API calls only)         |
| Secret leakage in logs            | PII scrubber middleware; never log `Authorization` headers |

### 8.2 Encryption

| Data               | Method                            | Key                            |
| ------------------ | --------------------------------- | ------------------------------ |
| API key secrets    | bcrypt (salt rounds: 12)          | N/A                            |
| Sensitive env vars | AES-256-GCM                       | `ENCRYPTION_KEY` (32-byte hex) |
| Session cookies    | JWT signed                        | `NEXTAUTH_SECRET`              |
| Object storage     | Server-side encryption (MinIO/S3) | Platform-managed               |

---

## 9. Deployment Architecture

### 9.1 Development

```yaml
# docker-compose.dev.yml (4 services)
services:
  postgres: # Port 5432
  clickhouse: # Port 8123 (HTTP), 9000 (native)
  redis: # Port 6379
  minio: # Port 9090 (API), 9091 (console)
```

Command: `pnpm run dx`

### 9.2 Self-Hosted Production

```yaml
# docker-compose.yml (6 services)
services:
  postgres:
  clickhouse:
  redis:
  minio:
  web: # Next.js, port 3000
  worker: # Express + BullMQ, port 3030
```

Requirements:

- 4 vCPU, 8GB RAM minimum (single-node)
- SSD storage for PostgreSQL and ClickHouse
- TLS termination at reverse proxy (nginx/traefik)

### 9.3 Kubernetes (Phase 1.5)

Helm chart structure:

```
charts/constell/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── web-deployment.yaml
│   ├── worker-deployment.yaml
│   ├── ingress.yaml
│   └── secrets.yaml
└── charts/
    ├── postgresql-*.tgz     # Bitnami subchart
    ├── clickhouse-*.tgz     # Custom or Altinity
    └── redis-*.tgz          # Bitnami subchart
```

### 9.4 Cloud-Hosted (Future)

Not in Phase 1 scope. Reserved for Phase 5.

---

## 10. Testing Strategy

### 10.1 Test Pyramid

```
        ▲
       / \
      / E2E \        Playwright (critical user journeys)
     /─────────\
    / Integration \   Vitest + testcontainers (API, DB, queue)
   /─────────────────\
  /     Unit          \  Vitest in-source + separate files (pure logic)
 /─────────────────────────\
```

### 10.2 Test Data Strategy

- **Factories** (using `prisma-factory` or hand-rolled): Create test entities with sensible defaults.
- **Database isolation**: Each test file gets a fresh PostgreSQL schema (`CREATE SCHEMA` → run migrations → test → `DROP SCHEMA`).
- **ClickHouse isolation**: Use `TRUNCATE` between tests (no schema isolation; fast enough).
- **Seed data**: `pnpm run db:seed:examples` populates demo data for manual testing.

### 10.3 CI Pipeline

```
PR Open
  └─ validate-pr-title.yml    # Conventional Commits
  └─ lint.yml                 # ESLint + Prettier
  └─ typecheck.yml            # TypeScript
  └─ test-unit.yml            # Unit tests (shared, worker, web server)
  └─ test-integration.yml     # Integration tests (requires services)
  └─ build.yml                # Next.js build + Docker image build
```

---

## 11. Observability of Constell Itself

Since Constell is an observability platform, it should "dogfood" its own patterns.

| Layer          | Instrumentation                                                  |
| -------------- | ---------------------------------------------------------------- |
| Web requests   | tRPC middleware logging + OpenTelemetry traces (Phase 2)         |
| Queue jobs     | BullMQ event listeners → metrics endpoint                        |
| DB queries     | Prisma query logging (dev only) + slow query alerts              |
| Worker health  | `/health` endpoint (Express) + liveness/readiness probes         |
| Error tracking | Structured logging (JSON) to stdout; aggregated by external tool |

---

### 11.1 Healthcheck Endpoints

| Service    | Endpoint          | Checks                                                  |
| ---------- | ----------------- | ------------------------------------------------------- |
| **web**    | `GET /api/health` | PostgreSQL connectivity, ClickHouse connectivity        |
| **worker** | `GET /health`     | PostgreSQL, ClickHouse, Redis connectivity, queue depth |

Liveness probe: HTTP 200 from `/health` (process is running).  
Readiness probe: All dependency checks pass (can accept traffic).  
Startup probe: 30s initial delay for worker (queues may need warm-up).

## 12. Extension Points

Explicitly designed for future expansion without breaking changes.

| Extension               | Hook                                                                                |
| ----------------------- | ----------------------------------------------------------------------------------- |
| **Evaluations**         | Add `scores` table in ClickHouse; new `evaluation-queue` in BullMQ; new tRPC router |
| **Datasets**            | New PostgreSQL tables (`Dataset`, `DatasetItem`, `DatasetRun`); new REST endpoints  |
| **Playground**          | Reuse existing prompt fetching + LLM execution helpers; new Next.js page            |
| **New SDK languages**   | REST API is language-agnostic; Fern generates clients                               |
| **New Model Providers** | Add pricing entry to `model_prices` table; no code changes                          |
| **Real-time features**  | WebSocket or Server-Sent Events from Next.js; subscribe to Redis pub/sub            |

---

## 13. Directory Structure (Target State)

```
Constell/
├── .github/
│   └── workflows/              # CI/CD
├── .agents/
│   ├── AGENTS.md
│   ├── ARCHITECTURE_PRINCIPLES.md
│   ├── README.md
│   └── skills/                 # Shared agent skills
├── scripts/
│   ├── setup.sh                # One-time dev setup
│   ├── postinstall.sh          # pnpm install hook
│   └── codex/
│       ├── setup.sh
│       └── maintenance.sh
├── fern/
│   └── apis/
│       └── v1/
│           ├── api.yml
│           └── definition/
├── generated/                  # Fern outputs (DO NOT EDIT)
├── docker-compose.dev.yml
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── .env.dev.example
├── .env.production.example
├── AGENTS.md
├── LICENSE
│
├── web/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── src/
│   │   ├── pages/
│   │   │   ├── _app.tsx
│   │   │   ├── api/
│   │   │   │   ├── auth/
│   │   │   │   │   └── [...nextauth].ts
│   │   │   │   └── public/
│   │   │   │       ├── ingestion.ts
│   │   │   │       ├── traces/
│   │   │   │       ├── observations/
│   │   │   │       └── prompts/
│   │   │   ├── traces/
│   │   │   ├── prompts/
│   │   │   └── index.tsx
│   │   ├── server/
│   │   │   └── api/
│   │   │       ├── trpc.ts
│   │   │       ├── root.ts
│   │   │       └── routers/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── traces/
│   │   │   ├── prompts/
│   │   │   └── public-api/
│   │   ├── components/
│   │   │   └── ui/             # shadcn/ui
│   │   ├── lib/
│   │   │   └── utils.ts
│   │   └── styles/
│   │       └── globals.css
│   └── AGENTS.md
│
├── worker/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app.ts
│   │   ├── queues/
│   │   │   ├── workerManager.ts
│   │   │   ├── ingestionProcessor.ts
│   │   │   └── blobStorageProcessor.ts
│   │   ├── features/
│   │   └── services/
│   └── AGENTS.md
│
├── packages/
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       ├── clickhouse/
│       │   └── migrations/
│       │       ├── clustered/
│       │       └── unclustered/
│       ├── src/
│       │   ├── index.ts
│       │   ├── db.ts
│       │   ├── env.ts
│       │   ├── constants/
│       │   ├── domain/
│       │   │   ├── traces.ts
│       │   │   ├── observations.ts
│       │   │   └── prompts.ts
│       │   ├── server/
│       │   │   ├── index.ts
│       │   │   ├── repositories/
│       │   │   ├── queues.ts
│       │   │   ├── redis/
│       │   │   ├── clickhouse/
│       │   │   ├── auth/
│       │   │   └── instrumentation/
│       │   ├── encryption/
│       │   │   └── index.ts
│       │   └── errors/
│       │       └── baseError.ts
│       └── AGENTS.md
│
└── ee/
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── index.ts
    │   ├── env.ts
    │   └── ee-license-check/
    │       └── index.ts
    └── AGENTS.md
```

---

## 14. Glossary

| Term               | Definition                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------- |
| **Trace**          | A single end-to-end execution (e.g., one user request). Contains spans and observations.      |
| **Observation**    | A discrete unit of work within a trace (e.g., LLM call, retrieval, tool execution).           |
| **Span**           | A timed operation. Parent of observations. Used for grouping.                                 |
| **Generation**     | A special observation type representing an LLM call. Includes model, usage, cost.             |
| **Wide Event**     | A denormalized, self-contained event record with all context inline. No joins needed.         |
| **Project**        | The primary isolation boundary. All data (traces, prompts, metrics) is project-scoped.        |
| **Prompt Version** | An immutable snapshot of a prompt at a point in time. Labeled (e.g., "latest", "production"). |

---

## 15. References

- [Langfuse Architecture Handbook](https://langfuse.com/handbook/product-engineering/architecture)
- [Langfuse GitHub — `langfuse/langfuse`](https://github.com/langfuse/langfuse)
- [Charity Majors — Observability 2.0](https://charity.wtf/tag/observability-2-0/)
- [All you need is Wide Events](https://isburmistrov.substack.com/p/all-you-need-is-wide-events-not-metrics)
- [ClickHouse Best Practices](https://clickhouse.com/docs/en/guides/improving-query-performance/sparse-primary-indexes)
