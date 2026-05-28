import { BatchQueue, type QueuedEvent } from "./batchQueue";
import { getPrompt } from "./promptClient";
import { DatasetClient, DatasetItemClient, DatasetRunClient } from "./datasetClient";
import type { TraceInput, ObservationInput, ScoreInput, Prompt } from "./types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export class ConstellClient {
  private queue: BatchQueue;
  private baseUrl: string;
  private publicKey: string;
  private secretKey: string;

  dataset: DatasetClient;
  datasetItem: DatasetItemClient;
  datasetRun: DatasetRunClient;

  constructor(opts: {
    baseUrl: string;
    publicKey: string;
    secretKey: string;
    flushIntervalMs?: number;
  }) {
    this.baseUrl = opts.baseUrl;
    this.publicKey = opts.publicKey;
    this.secretKey = opts.secretKey;
    this.queue = new BatchQueue(opts.baseUrl, opts.publicKey, opts.secretKey, opts.flushIntervalMs);
    this.queue.start();

    this.dataset = new DatasetClient(this);
    this.datasetItem = new DatasetItemClient(this);
    this.datasetRun = new DatasetRunClient(this);
  }

  trace(input: TraceInput) {
    const id = input.id ?? generateId();
    const event: QueuedEvent = {
      id: `evt-${id}`,
      type: "trace-create",
      timestamp: input.timestamp ?? new Date().toISOString(),
      body: {
        id,
        name: input.name,
        userId: input.userId,
        sessionId: input.sessionId,
        metadata: input.metadata,
        release: input.release,
        version: input.version,
        tags: input.tags,
        public: input.public,
      },
    };
    this.queue.enqueue(event);
    return id;
  }

  observation(input: ObservationInput) {
    const id = input.id ?? generateId();
    const body: Record<string, unknown> = {
      id,
      traceId: input.traceId,
      type: input.type ?? "SPAN",
      name: input.name,
      startTime: input.startTime,
      endTime: input.endTime,
      model: input.model,
      input: input.input,
      output: input.output,
      modelParameters: input.modelParameters,
      metadata: input.metadata,
      parentObservationId: input.parentObservationId,
      level: input.level ?? "DEFAULT",
      statusMessage: input.statusMessage,
      environment: input.environment,
      release: input.release,
      version: input.version,
      sessionId: input.sessionId,
      userId: input.userId,
    };
    if (input.usage) {
      body.usage = input.usage;
    }
    const event: QueuedEvent = {
      id: `evt-${id}`,
      type: "observation-create",
      timestamp: new Date().toISOString(),
      body,
    };
    this.queue.enqueue(event);
    return id;
  }

  generation(input: Omit<ObservationInput, "type">) {
    return this.observation({ ...input, type: "GENERATION" });
  }

  score(input: ScoreInput) {
    const id = generateId();
    const event: QueuedEvent = {
      id: `evt-${id}`,
      type: "score-create",
      timestamp: new Date().toISOString(),
      body: {
        id,
        traceId: input.traceId,
        observationId: input.observationId,
        name: input.name,
        value: input.value,
        stringValue: input.stringValue,
        dataType: input.dataType,
        comment: input.comment,
      },
    };
    this.queue.enqueue(event);
    return id;
  }

  async getPrompt(name: string, label?: string): Promise<Prompt> {
    return getPrompt(this.baseUrl, this.publicKey, this.secretKey, name, label);
  }

  async flush() {
    await this.queue.stop();
  }
}
