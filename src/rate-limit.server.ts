/**
 * Rate Limiting
 * Redis-capable with in-memory fallback for single-instance deployments
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

let redisClient: {
  incr: (key: string) => Promise<number>;
  pexpire: (key: string, ms: number) => Promise<number>;
  pttl: (key: string) => Promise<number>;
} | null = null;

let redisInitialized = false;

async function initRedis(): Promise<boolean> {
  if (redisInitialized) return redisClient !== null;
  redisInitialized = true;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return false;

  try {
    // @ts-expect-error — ioredis is an optional peer dependency
    const ioredis = (await import("ioredis")) as any; // eslint-disable-line
    const Redis = ioredis.default || ioredis;
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
    });
    await client.connect();
    redisClient = client;
    console.log("[rate-limit] Redis connected");
    return true;
  } catch {
    console.warn("[rate-limit] Redis unavailable, using in-memory");
    return false;
  }
}

// Periodic cleanup for in-memory store
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt < now) rateLimitStore.delete(key);
  }
}, 60_000);
if (cleanupTimer.unref) cleanupTimer.unref();

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
  keyGenerator?: (identifier: string) => string;
}

export const RATE_LIMIT_CONFIGS = {
  api: { limit: 100, windowMs: 60_000 },
  billing: { limit: 20, windowMs: 60_000 },
  webhook: { limit: 500, windowMs: 60_000 },
  auth: { limit: 10, windowMs: 60_000 },
} as const;

export interface RateLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
}

async function checkRedis(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  if (!redisClient) throw new Error("Redis not initialized");

  const now = Date.now();
  const count = await redisClient.incr(key);
  if (count === 1) await redisClient.pexpire(key, config.windowMs);

  const ttl = await redisClient.pttl(key);
  const resetAt = now + Math.max(ttl, 0);
  const allowed = count <= config.limit;

  return {
    allowed,
    current: count,
    limit: config.limit,
    remaining: Math.max(0, config.limit - count),
    resetAt,
    retryAfter: allowed ? 0 : Math.ceil(ttl / 1000),
  };
}

function checkMemory(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + config.windowMs };
    rateLimitStore.set(key, entry);
  }

  entry.count++;
  const allowed = entry.count <= config.limit;

  return {
    allowed,
    current: entry.count,
    limit: config.limit,
    remaining: Math.max(0, config.limit - entry.count),
    resetAt: entry.resetAt,
    retryAfter: allowed ? 0 : Math.ceil((entry.resetAt - now) / 1000),
  };
}

export async function checkRateLimitAsync(
  identifier: string,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.api
): Promise<RateLimitResult> {
  const key = config.keyGenerator ? config.keyGenerator(identifier) : `ratelimit:${identifier}`;

  const hasRedis = await initRedis();
  if (hasRedis && redisClient) {
    try {
      return await checkRedis(key, config);
    } catch {
      console.warn("[rate-limit] Redis error, falling back to in-memory");
    }
  }

  return checkMemory(key, config);
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.api
): RateLimitResult {
  const key = config.keyGenerator ? config.keyGenerator(identifier) : `ratelimit:${identifier}`;
  return checkMemory(key, config);
}

export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.resetAt),
      },
    }
  );
}

export async function applyRateLimitAsync(
  identifier: string,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.api
): Promise<Response | null> {
  const result = await checkRateLimitAsync(identifier, config);
  if (!result.allowed) {
    console.warn(`[rate-limit] Exceeded for ${identifier}: ${result.current}/${result.limit}`);
    return rateLimitResponse(result);
  }
  return null;
}

export function applyRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.api
): Response | null {
  const result = checkRateLimit(identifier, config);
  if (!result.allowed) {
    console.warn(`[rate-limit] Exceeded for ${identifier}: ${result.current}/${result.limit}`);
    return rateLimitResponse(result);
  }
  return null;
}

export function addRateLimitHeaders(response: Response, result: RateLimitResult): Response {
  const headers = new Headers(response.headers);
  headers.set("X-RateLimit-Limit", String(result.limit));
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set("X-RateLimit-Reset", String(result.resetAt));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
