export type EventType = "trace-create" | "observation-create" | "score-create";

export interface IngestionEvent {
  id: string;
  type: EventType;
  timestamp: string;
  body: EventBody;
}

export type EventBody = TraceCreateBody | ObservationCreateBody | ScoreCreateBody;

export interface TraceCreateBody {
  id: string;
  name?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  release?: string;
  version?: string;
  tags?: string[];
  public?: boolean;
  timestamp?: string;
}

export interface ObservationCreateBody {
  id: string;
  traceId: string;
  type: "SPAN" | "GENERATION" | "EVENT";
  name?: string;
  startTime?: string;
  endTime?: string;
  model?: string;
  input?: unknown;
  output?: unknown;
  usage?: {
    input?: number;
    output?: number;
    total?: number;
    unit?: "TOKENS" | "CHARACTERS" | "MILLISECONDS";
  };
  modelParameters?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  parentObservationId?: string;
  level?: "DEBUG" | "DEFAULT" | "WARNING" | "ERROR";
  statusMessage?: string;
  environment?: string;
  release?: string;
  version?: string;
  sessionId?: string;
  userId?: string;
}

export interface ScoreCreateBody {
  id?: string;
  traceId: string;
  observationId?: string;
  name: string;
  value?: number;
  stringValue?: string;
  dataType?: "NUMERIC" | "BOOLEAN" | "CATEGORICAL";
  source?: "API" | "UI" | "EVAL";
  comment?: string;
  timestamp?: string;
}

export interface ProcessingFailure {
  eventId: string;
  eventType: EventType | string;
  reason: string;
  code: string;
}
