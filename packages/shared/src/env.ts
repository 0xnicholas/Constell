import { z } from "zod";

const booleanFromEnv = (defaultValue: "true" | "false") =>
  z
    .enum(["true", "false"])
    .default(defaultValue)
    .transform((v) => v === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  CLICKHOUSE_URL: z.string().min(1),
  CLICKHOUSE_USER: z.string().default("default"),
  CLICKHOUSE_PASSWORD: z.string().default(""),
  CLICKHOUSE_MIGRATION_URL: z.string().optional(),
  CLICKHOUSE_CLUSTER_ENABLED: booleanFromEnv("false"),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_AUTH: z.string().optional(),
  SALT: z.string().min(1),
  ENCRYPTION_KEY: z
    .string()
    .length(64)
    .regex(/^[0-9a-fA-F]+$/),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  TELEMETRY_ENABLED: booleanFromEnv("true"),
  CONSTELL_ENABLE_EXPERIMENTAL_FEATURES: booleanFromEnv("false"),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables.
 * Call once at application startup. Never call in browser bundles.
 */
export function parseEnv(raw: Record<string, string | undefined>): Env {
  return envSchema.parse(raw);
}
