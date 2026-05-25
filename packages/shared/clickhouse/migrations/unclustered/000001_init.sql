CREATE TABLE IF NOT EXISTS observations_wide (
    id UUID,
    trace_id UUID,
    project_id UUID,
    type String,
    name String,
    start_time DateTime64(3),
    end_time DateTime64(3),
    latency_ms UInt32,
    input String,
    output String,
    model String,
    model_parameters String,
    input_tokens UInt32,
    output_tokens UInt32,
    total_tokens UInt32,
    calculated_cost Decimal64(12),
    level String,
    status_message String,
    environment String,
    release String,
    version String,
    session_id String,
    user_id String,
    metadata String,
    parent_observation_id Nullable(UUID),
    event_ts DateTime64(3),
    ingested_at DateTime64(3) DEFAULT now(),
    INDEX idx_trace_id trace_id TYPE bloom_filter GRANULARITY 3,
    INDEX idx_project_id project_id TYPE bloom_filter GRANULARITY 3
)
ENGINE = ReplacingMergeTree(event_ts)
PARTITION BY toYYYYMMDD(ingested_at)
ORDER BY (project_id, toDate(ingested_at), trace_id, start_time, id)
TTL ingested_at + INTERVAL 90 DAY;

CREATE TABLE IF NOT EXISTS traces_wide (
    id UUID,
    project_id UUID,
    user_id Nullable(String),
    session_id Nullable(String),
    release Nullable(String),
    version Nullable(String),
    total_tokens UInt32 DEFAULT 0,
    total_cost Decimal64(12) DEFAULT 0,
    latency_ms UInt32 DEFAULT 0,
    observation_count UInt32 DEFAULT 0,
    has_error UInt8 DEFAULT 0,
    created_at DateTime64(3),
    updated_at DateTime64(3),
    event_ts DateTime64(3),
    ingested_at DateTime64(3) DEFAULT now(),
    INDEX idx_project_id project_id TYPE bloom_filter GRANULARITY 3
)
ENGINE = ReplacingMergeTree(event_ts)
PARTITION BY toYYYYMMDD(ingested_at)
ORDER BY (project_id, toDate(ingested_at), created_at, id)
TTL ingested_at + INTERVAL 90 DAY;
