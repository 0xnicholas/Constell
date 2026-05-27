import { getClickHouseClient } from "@constell/shared/src/server";

export interface ClickHouseTraceRow {
  id: string;
  project_id: string;
  user_id: string | null;
  session_id: string | null;
  release: string | null;
  version: string | null;
  total_tokens: number;
  total_cost: number;
  latency_ms: number;
  observation_count: number;
  has_error: number;
  created_at: string;
  updated_at: string;
  event_ts: string;
  ingested_at: string;
}

export interface ClickHouseScoreRow {
  id: string;
  project_id: string;
  trace_id: string;
  observation_id: string | null;
  name: string;
  config_id: string | null;
  value: number;
  string_value: string | null;
  data_type: string;
  source: string;
  comment: string | null;
  created_at: string;
  event_ts: string;
  ingested_at: string;
}

export interface ClickHouseObservationRow {
  id: string;
  trace_id: string;
  project_id: string;
  type: string;
  name: string | null;
  start_time: string | null;
  end_time: string | null;
  latency_ms: number;
  input: string;
  output: string;
  model: string | null;
  model_parameters: string | null;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  calculated_cost: number;
  level: string;
  status_message: string | null;
  environment: string | null;
  release: string | null;
  version: string | null;
  session_id: string | null;
  user_id: string | null;
  metadata: string;
  parent_observation_id: string | null;
  prompt_name?: string | null;
  prompt_version?: string | null;
  event_ts: string;
  ingested_at: string;
}

export class ClickHouseBatchWriter {
  private traces: ClickHouseTraceRow[] = [];
  private observations: ClickHouseObservationRow[] = [];
  private scores: ClickHouseScoreRow[] = [];

  addTrace(row: ClickHouseTraceRow): void {
    this.traces.push(row);
  }

  addObservation(row: ClickHouseObservationRow): void {
    this.observations.push(row);
  }

  addScore(row: ClickHouseScoreRow): void {
    this.scores.push(row);
  }

  async flush(): Promise<{
    traceCount: number;
    observationCount: number;
    scoreCount: number;
  }> {
    const client = getClickHouseClient();
    let traceCount = 0;
    let observationCount = 0;

    if (this.traces.length > 0) {
      await client.insert({
        table: "traces_wide",
        values: this.traces,
        format: "JSONEachRow",
      });
      traceCount = this.traces.length;
      this.traces = [];
    }

    if (this.observations.length > 0) {
      await client.insert({
        table: "observations_wide",
        values: this.observations,
        format: "JSONEachRow",
      });
      observationCount = this.observations.length;
      this.observations = [];
    }

    let scoreCount = 0;
    if (this.scores.length > 0) {
      await client.insert({
        table: "scores_wide",
        values: this.scores,
        format: "JSONEachRow",
      });
      scoreCount = this.scores.length;
      this.scores = [];
    }

    return { traceCount, observationCount, scoreCount };
  }
}
