import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the sentry module before importing rate-limit (logger depends on sentry)
vi.mock("../src/sentry.server.js", () => ({
  captureException: vi.fn().mockResolvedValue(null),
  initSentry: vi.fn().mockResolvedValue(false),
}));

import {
  checkRateLimit,
  applyRateLimit,
  rateLimitResponse,
  addRateLimitHeaders,
  RATE_LIMIT_CONFIGS,
  type RateLimitResult,
} from "../src/rate-limit.server.js";

// ─── RATE_LIMIT_CONFIGS ─────────────────────────────────────────────────────

describe("RATE_LIMIT_CONFIGS", () => {
  it("defines an api config", () => {
    expect(RATE_LIMIT_CONFIGS.api).toEqual({ limit: 100, windowMs: 60_000 });
  });

  it("defines a billing config", () => {
    expect(RATE_LIMIT_CONFIGS.billing).toEqual({ limit: 20, windowMs: 60_000 });
  });

  it("defines a webhook config", () => {
    expect(RATE_LIMIT_CONFIGS.webhook).toEqual({ limit: 500, windowMs: 60_000 });
  });

  it("defines an auth config", () => {
    expect(RATE_LIMIT_CONFIGS.auth).toEqual({ limit: 10, windowMs: 60_000 });
  });
});

// ─── checkRateLimit (in-memory) ─────────────────────────────────────────────

describe("checkRateLimit", () => {
  // Use unique identifiers per test to avoid cross-test state leakage
  let counter = 0;
  function uniqueId() {
    counter++;
    return `test-store-${counter}-${Date.now()}.myshopify.com`;
  }

  it("allows the first request", () => {
    const result = checkRateLimit(uniqueId());
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(1);
    expect(result.remaining).toBe(99);
    expect(result.retryAfter).toBe(0);
  });

  it("increments the count on subsequent requests", () => {
    const id = uniqueId();
    checkRateLimit(id);
    const result = checkRateLimit(id);
    expect(result.current).toBe(2);
    expect(result.remaining).toBe(98);
  });

  it("denies requests when the limit is exceeded", () => {
    const id = uniqueId();
    const config = { limit: 3, windowMs: 60_000 };

    checkRateLimit(id, config);
    checkRateLimit(id, config);
    checkRateLimit(id, config);

    const result = checkRateLimit(id, config);
    expect(result.allowed).toBe(false);
    expect(result.current).toBe(4);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("allows request at exactly the limit", () => {
    const id = uniqueId();
    const config = { limit: 2, windowMs: 60_000 };

    checkRateLimit(id, config);
    const result = checkRateLimit(id, config);
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(2);
    expect(result.remaining).toBe(0);
  });

  it("resets after the window expires", () => {
    const id = uniqueId();
    const config = { limit: 1, windowMs: 50 };

    checkRateLimit(id, config);

    // Simulate time passing by manipulating the internal state.
    // Since we cannot directly access the store, we wait for a short period.
    // Instead, use a very short window and check with a fresh call after expiry.
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const result = checkRateLimit(id, config);
        expect(result.allowed).toBe(true);
        expect(result.current).toBe(1);
        resolve();
      }, 60);
    });
  });

  it("uses the default api config when none is provided", () => {
    const id = uniqueId();
    const result = checkRateLimit(id);
    expect(result.limit).toBe(100);
  });

  it("uses a custom key generator when provided", () => {
    const id = uniqueId();
    const config = {
      limit: 5,
      windowMs: 60_000,
      keyGenerator: (identifier: string) => `custom:${identifier}`,
    };

    const result = checkRateLimit(id, config);
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(1);
  });

  it("tracks different identifiers independently", () => {
    const id1 = uniqueId();
    const id2 = uniqueId();
    const config = { limit: 1, windowMs: 60_000 };

    checkRateLimit(id1, config);
    const result = checkRateLimit(id2, config);

    expect(result.allowed).toBe(true);
    expect(result.current).toBe(1);
  });

  it("returns a proper resetAt timestamp in the future", () => {
    const id = uniqueId();
    const now = Date.now();
    const result = checkRateLimit(id);
    expect(result.resetAt).toBeGreaterThanOrEqual(now);
  });
});

// ─── applyRateLimit ─────────────────────────────────────────────────────────

describe("applyRateLimit", () => {
  let counter = 0;
  function uniqueId() {
    counter++;
    return `apply-test-${counter}-${Date.now()}.myshopify.com`;
  }

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("returns null when the request is within the limit", () => {
    const response = applyRateLimit(uniqueId());
    expect(response).toBeNull();
  });

  it("returns a 429 Response when the limit is exceeded", () => {
    const id = uniqueId();
    const config = { limit: 1, windowMs: 60_000 };

    applyRateLimit(id, config);
    const response = applyRateLimit(id, config);

    expect(response).not.toBeNull();
    expect(response?.status).toBe(429);
  });

  it("logs a warning when the limit is exceeded", () => {
    const id = uniqueId();
    const config = { limit: 1, windowMs: 60_000 };

    applyRateLimit(id, config);
    applyRateLimit(id, config);

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("[rate-limit] Exceeded")
    );
  });
});

// ─── rateLimitResponse ──────────────────────────────────────────────────────

describe("rateLimitResponse", () => {
  const mockResult: RateLimitResult = {
    allowed: false,
    current: 11,
    limit: 10,
    remaining: 0,
    resetAt: Date.now() + 30_000,
    retryAfter: 30,
  };

  it("returns a 429 status response", () => {
    const response = rateLimitResponse(mockResult);
    expect(response.status).toBe(429);
  });

  it("sets the Retry-After header", () => {
    const response = rateLimitResponse(mockResult);
    expect(response.headers.get("Retry-After")).toBe("30");
  });

  it("sets rate limit headers", () => {
    const response = rateLimitResponse(mockResult);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("10");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(response.headers.get("X-RateLimit-Reset")).toBe(String(mockResult.resetAt));
  });

  it("includes a JSON body with error details", async () => {
    const response = rateLimitResponse(mockResult);
    const body = await response.json();
    expect(body.error).toBe("Too Many Requests");
    expect(body.retryAfter).toBe(30);
  });

  it("sets Content-Type to application/json", () => {
    const response = rateLimitResponse(mockResult);
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });
});

// ─── addRateLimitHeaders ────────────────────────────────────────────────────

describe("addRateLimitHeaders", () => {
  it("adds rate limit headers to an existing response", () => {
    const original = new Response("OK", { status: 200 });
    const result: RateLimitResult = {
      allowed: true,
      current: 5,
      limit: 100,
      remaining: 95,
      resetAt: Date.now() + 55_000,
      retryAfter: 0,
    };

    const enhanced = addRateLimitHeaders(original, result);

    expect(enhanced.status).toBe(200);
    expect(enhanced.headers.get("X-RateLimit-Limit")).toBe("100");
    expect(enhanced.headers.get("X-RateLimit-Remaining")).toBe("95");
    expect(enhanced.headers.get("X-RateLimit-Reset")).toBe(String(result.resetAt));
  });

  it("preserves the original response status and statusText", () => {
    const original = new Response(null, { status: 201, statusText: "Created" });
    const result: RateLimitResult = {
      allowed: true,
      current: 1,
      limit: 100,
      remaining: 99,
      resetAt: Date.now() + 60_000,
      retryAfter: 0,
    };

    const enhanced = addRateLimitHeaders(original, result);
    expect(enhanced.status).toBe(201);
    expect(enhanced.statusText).toBe("Created");
  });

  it("preserves existing headers on the response", () => {
    const original = new Response(null, {
      status: 200,
      headers: { "X-Custom": "value" },
    });
    const result: RateLimitResult = {
      allowed: true,
      current: 1,
      limit: 50,
      remaining: 49,
      resetAt: Date.now() + 60_000,
      retryAfter: 0,
    };

    const enhanced = addRateLimitHeaders(original, result);
    expect(enhanced.headers.get("X-Custom")).toBe("value");
    expect(enhanced.headers.get("X-RateLimit-Limit")).toBe("50");
  });
});
