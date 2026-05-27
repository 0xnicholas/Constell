CREATE TABLE IF NOT EXISTS scores_wide (
    id String,
    project_id String,
    trace_id String,
    observation_id Nullable(String),
    name String,
    config_id Nullable(String),
    value Float64,
    string_value Nullable(String),
    data_type String,
    source String,
    comment Nullable(String),
    created_at DateTime64(3),
    event_ts DateTime64(3),
    ingested_at DateTime64(3) DEFAULT now(),
    INDEX idx_project_name (project_id, name) TYPE bloom_filter GRANULARITY 3,
    INDEX idx_trace_id trace_id TYPE bloom_filter GRANULARITY 3
)
ENGINE = ReplacingMergeTree(event_ts)
PARTITION BY toYYYYMMDD(ingested_at)
ORDER BY (project_id, toDate(ingested_at), name, created_at, id)
TTL ingested_at + INTERVAL 90 DAY;
