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
  event_ts: string;
  ingested_at: string;
}

export class ClickHouseBatchWriter {
  private traces: ClickHouseTraceRow[] = [];
  private observations: ClickHouseObservationRow[] = [];

  addTrace(row: ClickHouseTraceRow): void {
    this.traces.push(row);
  }

  addObservation(row: ClickHouseObservationRow): void {
    this.observations.push(row);
  }

  async flush(): Promise<{
    traceCount: number;
    observationCount: number;
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

    return { traceCount, observationCount };
  }
}
