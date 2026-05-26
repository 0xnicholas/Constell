import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_AUTH,
  maxRetriesPerRequest: 3,
  connectTimeout: 2000,
  lazyConnect: true,
});

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Fixed-window counter rate limiter.
 * Default: 1000 events per minute per API key.
 */
export async function checkRateLimit(
  key: string,
  opts: { windowMs: number; maxRequests: number } = {
    windowMs: 60_000,
    maxRequests: 1000,
  }
): Promise<RateLimitResult> {
  const bucketKey = `ratelimit:${key}`;
  const now = Date.now();
  const windowStart = Math.floor(now / opts.windowMs) * opts.windowMs;
  const windowKey = `${bucketKey}:${windowStart}`;

  const pipeline = redis.pipeline();
  pipeline.incr(windowKey);
  pipeline.pexpire(windowKey, opts.windowMs);
  const results = await pipeline.exec();

  const count = (results?.[0]?.[1] as number) ?? 1;
  const allowed = count <= opts.maxRequests;
  const remaining = Math.max(0, opts.maxRequests - count);
  const resetAt = windowStart + opts.windowMs;

  return { allowed, remaining, resetAt };
}
