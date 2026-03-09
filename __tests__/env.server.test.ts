import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { createEnvValidator } from "../src/env.server.js";

// We test createEnvValidator rather than the default singleton exports
// because the singleton caches its result across tests.

const VALID_ENV = {
  SHOPIFY_API_KEY: "test-api-key",
  SHOPIFY_API_SECRET: "test-api-secret",
  SHOPIFY_APP_URL: "https://app.example.com",
  SCOPES: "read_products,write_products",
  DATABASE_URL: "postgresql://localhost:5432/test",
  NODE_ENV: "test",
};

describe("createEnvValidator", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env for each test so validation is fresh
    process.env = { ...originalEnv };
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("validateEnv", () => {
    it("succeeds with all required env vars present", () => {
      Object.assign(process.env, VALID_ENV);
      const { validateEnv } = createEnvValidator();
      const env = validateEnv();

      expect(env.SHOPIFY_API_KEY).toBe("test-api-key");
      expect(env.SHOPIFY_API_SECRET).toBe("test-api-secret");
      expect(env.SHOPIFY_APP_URL).toBe("https://app.example.com");
      expect(env.SCOPES).toBe("read_products,write_products");
      expect(env.DATABASE_URL).toBe("postgresql://localhost:5432/test");
    });

    it("throws when SHOPIFY_API_KEY is missing", () => {
      Object.assign(process.env, VALID_ENV);
      delete process.env.SHOPIFY_API_KEY;
      const { validateEnv } = createEnvValidator();

      expect(() => validateEnv()).toThrow("Invalid environment configuration");
    });

    it("throws when SHOPIFY_API_SECRET is missing", () => {
      Object.assign(process.env, VALID_ENV);
      delete process.env.SHOPIFY_API_SECRET;
      const { validateEnv } = createEnvValidator();

      expect(() => validateEnv()).toThrow("Invalid environment configuration");
    });

    it("throws when SHOPIFY_APP_URL is not a valid URL", () => {
      Object.assign(process.env, { ...VALID_ENV, SHOPIFY_APP_URL: "not-a-url" });
      const { validateEnv } = createEnvValidator();

      expect(() => validateEnv()).toThrow("Invalid environment configuration");
    });

    it("throws when SCOPES is empty", () => {
      Object.assign(process.env, { ...VALID_ENV, SCOPES: "" });
      const { validateEnv } = createEnvValidator();

      expect(() => validateEnv()).toThrow("Invalid environment configuration");
    });

    it("throws when DATABASE_URL is missing", () => {
      Object.assign(process.env, VALID_ENV);
      delete process.env.DATABASE_URL;
      const { validateEnv } = createEnvValidator();

      expect(() => validateEnv()).toThrow("Invalid environment configuration");
    });

    it("defaults NODE_ENV to development when not set", () => {
      Object.assign(process.env, VALID_ENV);
      delete process.env.NODE_ENV;
      const { validateEnv } = createEnvValidator();
      const env = validateEnv();

      expect(env.NODE_ENV).toBe("development");
    });

    it("defaults PORT to 3000 when not set", () => {
      Object.assign(process.env, VALID_ENV);
      delete process.env.PORT;
      const { validateEnv } = createEnvValidator();
      const env = validateEnv();

      expect(env.PORT).toBe("3000");
    });

    it("accepts optional vars when present", () => {
      Object.assign(process.env, {
        ...VALID_ENV,
        SENTRY_DSN: "https://sentry.example.com/123",
        REDIS_URL: "redis://localhost:6379",
        SHOP_CUSTOM_DOMAIN: "myshop.com",
      });
      const { validateEnv } = createEnvValidator();
      const env = validateEnv();

      expect(env.SENTRY_DSN).toBe("https://sentry.example.com/123");
      expect(env.REDIS_URL).toBe("redis://localhost:6379");
      expect(env.SHOP_CUSTOM_DOMAIN).toBe("myshop.com");
    });

    it("caches the result on subsequent calls", () => {
      Object.assign(process.env, VALID_ENV);
      const { validateEnv } = createEnvValidator();

      const first = validateEnv();
      const second = validateEnv();
      expect(first).toBe(second); // Same reference
    });

    it("throws when NODE_ENV is an invalid value", () => {
      Object.assign(process.env, { ...VALID_ENV, NODE_ENV: "staging" });
      const { validateEnv } = createEnvValidator();

      expect(() => validateEnv()).toThrow("Invalid environment configuration");
    });

    it("logs the validation errors to console.error", () => {
      Object.assign(process.env, VALID_ENV);
      delete process.env.SHOPIFY_API_KEY;
      const { validateEnv } = createEnvValidator();

      try {
        validateEnv();
      } catch {
        // Expected
      }

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Environment validation failed")
      );
    });
  });

  describe("getEnv", () => {
    it("calls validateEnv if not yet validated", () => {
      Object.assign(process.env, VALID_ENV);
      const { getEnv } = createEnvValidator();
      const env = getEnv();
      expect(env.SHOPIFY_API_KEY).toBe("test-api-key");
    });

    it("returns cached result after first call", () => {
      Object.assign(process.env, VALID_ENV);
      const { getEnv, validateEnv } = createEnvValidator();
      validateEnv();
      const env = getEnv();
      expect(env.SHOPIFY_API_KEY).toBe("test-api-key");
    });
  });

  describe("isProduction / isDevelopment", () => {
    it("isProduction returns true when NODE_ENV is production", () => {
      Object.assign(process.env, { ...VALID_ENV, NODE_ENV: "production" });
      const { isProduction } = createEnvValidator();
      expect(isProduction()).toBe(true);
    });

    it("isProduction returns false when NODE_ENV is development", () => {
      Object.assign(process.env, { ...VALID_ENV, NODE_ENV: "development" });
      const { isProduction } = createEnvValidator();
      expect(isProduction()).toBe(false);
    });

    it("isDevelopment returns true when NODE_ENV is development", () => {
      Object.assign(process.env, { ...VALID_ENV, NODE_ENV: "development" });
      const { isDevelopment } = createEnvValidator();
      expect(isDevelopment()).toBe(true);
    });

    it("isDevelopment returns false when NODE_ENV is production", () => {
      Object.assign(process.env, { ...VALID_ENV, NODE_ENV: "production" });
      const { isDevelopment } = createEnvValidator();
      expect(isDevelopment()).toBe(false);
    });
  });

  describe("extra schema merging", () => {
    it("validates app-specific extra env vars", () => {
      Object.assign(process.env, {
        ...VALID_ENV,
        GTM_DEFAULT_CONSENT: "granted",
      });

      const { validateEnv } = createEnvValidator(
        z.object({
          GTM_DEFAULT_CONSENT: z.string().min(1),
        })
      );

      const env = validateEnv();
      expect((env as any).GTM_DEFAULT_CONSENT).toBe("granted");
    });

    it("throws when extra required var is missing", () => {
      Object.assign(process.env, VALID_ENV);

      const { validateEnv } = createEnvValidator(
        z.object({
          REQUIRED_CUSTOM_VAR: z.string().min(1),
        })
      );

      expect(() => validateEnv()).toThrow("Invalid environment configuration");
    });

    it("accepts extra optional vars when not present", () => {
      Object.assign(process.env, VALID_ENV);

      const { validateEnv } = createEnvValidator(
        z.object({
          OPTIONAL_VAR: z.string().optional(),
        })
      );

      const env = validateEnv();
      expect((env as any).OPTIONAL_VAR).toBeUndefined();
    });
  });
});
