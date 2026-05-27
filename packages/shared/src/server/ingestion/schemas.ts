import { z } from "zod";

export const traceCreateBodySchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  release: z.string().optional(),
  version: z.string().optional(),
  tags: z.array(z.string()).optional(),
  public: z.boolean().optional(),
  timestamp: z.string().datetime().optional(),
});

export const scoreCreateBodySchema = z.object({
  id: z.string().min(1).optional(),
  traceId: z.string().min(1),
  observationId: z.string().optional(),
  name: z.string().min(1),
  value: z.number().optional(),
  stringValue: z.string().optional(),
  dataType: z.enum(["NUMERIC", "BOOLEAN", "CATEGORICAL"]).optional(),
  source: z.enum(["API", "UI", "EVAL"]).optional(),
  comment: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

export const observationCreateBodySchema = z.object({
  id: z.string().min(1),
  traceId: z.string().min(1),
  type: z.enum(["SPAN", "GENERATION", "EVENT"]),
  name: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  model: z.string().optional(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  usage: z
    .object({
      input: z.number().optional(),
      output: z.number().optional(),
      total: z.number().optional(),
      unit: z.enum(["TOKENS", "CHARACTERS", "MILLISECONDS"]).optional(),
    })
    .optional(),
  modelParameters: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  parentObservationId: z.string().optional(),
  level: z.enum(["DEBUG", "DEFAULT", "WARNING", "ERROR"]).optional(),
  statusMessage: z.string().optional(),
  environment: z.string().optional(),
  release: z.string().optional(),
  version: z.string().optional(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  promptName: z.string().optional(),
  promptVersion: z.string().optional(),
});

export const ingestionEventSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["trace-create", "observation-create", "score-create"]),
  timestamp: z.string().datetime(),
  body: z.union([observationCreateBodySchema, traceCreateBodySchema, scoreCreateBodySchema]),
});

export const ingestionBatchSchema = z.object({
  batch: z.array(ingestionEventSchema).max(100),
});
