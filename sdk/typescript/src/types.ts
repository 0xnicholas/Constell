export interface Usage {
  input?: number;
  output?: number;
  total?: number;
  unit?: "TOKENS" | "CHARACTERS" | "MILLISECONDS";
}

export interface TraceInput {
  id?: string;
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

export interface ObservationInput {
  id?: string;
  traceId: string;
  type?: "SPAN" | "GENERATION" | "EVENT";
  name?: string;
  startTime?: string;
  endTime?: string;
  model?: string;
  input?: unknown;
  output?: unknown;
  usage?: Usage;
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
