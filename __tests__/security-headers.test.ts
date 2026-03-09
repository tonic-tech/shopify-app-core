import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SECURITY_HEADERS,
  addSecurityHeaders,
  createSecureHeaders,
  getCSPHeader,
  generateNonce,
} from "../src/security-headers.server.js";

// ─── SECURITY_HEADERS constant ──────────────────────────────────────────────

describe("SECURITY_HEADERS", () => {
  it("contains X-Content-Type-Options set to nosniff", () => {
    expect(SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("does not contain X-Frame-Options (removed for Shopify iframe compatibility)", () => {
    expect(SECURITY_HEADERS["X-Frame-Options"]).toBeUndefined();
  });

  it("contains X-XSS-Protection", () => {
    expect(SECURITY_HEADERS["X-XSS-Protection"]).toBe("1; mode=block");
  });

  it("contains Referrer-Policy", () => {
    expect(SECURITY_HEADERS["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("contains Permissions-Policy", () => {
    expect(SECURITY_HEADERS["Permissions-Policy"]).toContain("geolocation=()");
    expect(SECURITY_HEADERS["Permissions-Policy"]).toContain("payment=(self)");
  });

  it("contains X-DNS-Prefetch-Control", () => {
    expect(SECURITY_HEADERS["X-DNS-Prefetch-Control"]).toBe("on");
  });

  it("has exactly 5 headers", () => {
    expect(Object.keys(SECURITY_HEADERS)).toHaveLength(5);
  });
});

// ─── addSecurityHeaders ─────────────────────────────────────────────────────

describe("addSecurityHeaders", () => {
  it("adds all security headers to a plain response", () => {
    const original = new Response("OK", { status: 200 });
    const enhanced = addSecurityHeaders(original);

    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      expect(enhanced.headers.get(key)).toBe(value);
    }
  });

  it("preserves the original response status", () => {
    const original = new Response(null, { status: 201 });
    const enhanced = addSecurityHeaders(original);
    expect(enhanced.status).toBe(201);
  });

  it("preserves existing headers", () => {
    const original = new Response(null, {
      status: 200,
      headers: { "X-Custom-Header": "custom-value" },
    });
    const enhanced = addSecurityHeaders(original);
    expect(enhanced.headers.get("X-Custom-Header")).toBe("custom-value");
  });

  it("does not overwrite an existing security header already set", () => {
    const original = new Response(null, {
      status: 200,
      headers: { "X-Frame-Options": "DENY" },
    });
    const enhanced = addSecurityHeaders(original);
    // The implementation uses headers.has() check, so it should preserve existing value
    expect(enhanced.headers.get("X-Frame-Options")).toBe("DENY");
  });
});

// ─── createSecureHeaders ────────────────────────────────────────────────────

describe("createSecureHeaders", () => {
  it("creates Headers with all security headers", () => {
    const headers = createSecureHeaders();

    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      expect(headers.get(key)).toBe(value);
    }
  });

  it("includes additional headers when provided", () => {
    const headers = createSecureHeaders({ "X-Custom": "foo" });
    expect(headers.get("X-Custom")).toBe("foo");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("allows additional headers to override security defaults", () => {
    const headers = createSecureHeaders({ "X-Frame-Options": "DENY" });
    expect(headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("returns a Headers instance", () => {
    const headers = createSecureHeaders();
    expect(headers).toBeInstanceOf(Headers);
  });
});

// ─── getCSPHeader ───────────────────────────────────────────────────────────

describe("getCSPHeader", () => {
  beforeEach(() => {
    // Ensure we test in non-production by default
    vi.stubEnv("NODE_ENV", "test");
  });

  it("returns a string containing default-src 'self'", () => {
    const csp = getCSPHeader();
    expect(csp).toContain("default-src 'self'");
  });

  it("uses unsafe-inline for script-src when no nonce is provided", () => {
    const csp = getCSPHeader();
    expect(csp).toContain("'unsafe-inline'");
    expect(csp).not.toContain("'nonce-");
  });

  it("uses a nonce for script-src when nonce is provided", () => {
    const csp = getCSPHeader("abc123");
    expect(csp).toContain("'nonce-abc123'");
    // script-src should use the nonce instead of unsafe-inline,
    // but style-src still uses unsafe-inline (by design)
    const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src"));
    expect(scriptSrc).toContain("'nonce-abc123'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("includes Shopify CDN domains", () => {
    const csp = getCSPHeader();
    expect(csp).toContain("https://cdn.shopify.com");
    expect(csp).toContain("https://cdn.shopifycloud.com");
  });

  it("includes frame-ancestors for Shopify embedding", () => {
    const csp = getCSPHeader();
    expect(csp).toContain("frame-ancestors");
    expect(csp).toContain("https://admin.shopify.com");
  });

  it("includes object-src 'none' to prevent plugin execution", () => {
    const csp = getCSPHeader();
    expect(csp).toContain("object-src 'none'");
  });

  it("includes upgrade-insecure-requests in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const csp = getCSPHeader();
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("does not include upgrade-insecure-requests in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    const csp = getCSPHeader();
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});

// ─── generateNonce ──────────────────────────────────────────────────────────

describe("generateNonce", () => {
  it("returns a non-empty string", () => {
    const nonce = generateNonce();
    expect(nonce).toBeTruthy();
    expect(typeof nonce).toBe("string");
    expect(nonce.length).toBeGreaterThan(0);
  });

  it("generates unique values on subsequent calls", () => {
    const nonces = new Set<string>();
    for (let i = 0; i < 10; i++) {
      nonces.add(generateNonce());
    }
    // With 16 random bytes, collisions are virtually impossible
    expect(nonces.size).toBe(10);
  });

  it("generates a base64-encoded string", () => {
    const nonce = generateNonce();
    // Base64 characters: A-Z, a-z, 0-9, +, /, =
    expect(nonce).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});
