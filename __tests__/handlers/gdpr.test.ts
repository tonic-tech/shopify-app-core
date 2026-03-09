import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/sentry.server.js", () => ({
  captureException: vi.fn().mockResolvedValue(null),
  initSentry: vi.fn().mockResolvedValue(false),
}));

import { createGDPRAction } from "../../src/handlers/gdpr.js";

function createMockAuthenticate(overrides?: {
  topic?: string;
  payload?: unknown;
  shop?: string;
}) {
  return {
    webhook: vi.fn().mockResolvedValue({
      topic: overrides?.topic ?? "CUSTOMERS_DATA_REQUEST",
      payload: overrides?.payload ?? {
        shop_id: 1,
        shop_domain: "test-store.myshopify.com",
        customer: { id: 42, email: "customer@example.com" },
      },
      shop: overrides?.shop ?? "test-store.myshopify.com",
    }),
  };
}

function createMockOps() {
  return {
    deleteShop: vi.fn().mockResolvedValue(undefined),
    deleteSessions: vi.fn().mockResolvedValue(undefined),
  };
}

describe("createGDPRAction", () => {
  let mockOps: ReturnType<typeof createMockOps>;

  beforeEach(() => {
    mockOps = createMockOps();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // ─── CUSTOMERS_DATA_REQUEST ─────────────────────────────────────────────

  describe("CUSTOMERS_DATA_REQUEST", () => {
    it("returns 200 and does not delete anything", async () => {
      const mockAuth = createMockAuthenticate({ topic: "CUSTOMERS_DATA_REQUEST" });
      const action = createGDPRAction(mockAuth, mockOps);
      const response = await action({ request: new Request("http://localhost") });

      expect(response.status).toBe(200);
      expect(mockOps.deleteShop).not.toHaveBeenCalled();
      expect(mockOps.deleteSessions).not.toHaveBeenCalled();
    });
  });

  // ─── CUSTOMERS_REDACT ──────────────────────────────────────────────────

  describe("CUSTOMERS_REDACT", () => {
    it("returns 200 and does not delete shop data", async () => {
      const mockAuth = createMockAuthenticate({ topic: "CUSTOMERS_REDACT" });
      const action = createGDPRAction(mockAuth, mockOps);
      const response = await action({ request: new Request("http://localhost") });

      expect(response.status).toBe(200);
      expect(mockOps.deleteShop).not.toHaveBeenCalled();
      expect(mockOps.deleteSessions).not.toHaveBeenCalled();
    });
  });

  // ─── SHOP_REDACT ───────────────────────────────────────────────────────

  describe("SHOP_REDACT", () => {
    it("returns 200 and deletes shop data and sessions", async () => {
      const mockAuth = createMockAuthenticate({
        topic: "SHOP_REDACT",
        payload: { shop_domain: "test-store.myshopify.com" },
      });
      const action = createGDPRAction(mockAuth, mockOps);
      const response = await action({ request: new Request("http://localhost") });

      expect(response.status).toBe(200);
      expect(mockOps.deleteShop).toHaveBeenCalledWith("test-store.myshopify.com");
      expect(mockOps.deleteSessions).toHaveBeenCalledWith("test-store.myshopify.com");
    });

    it("returns 200 even when deleteShop throws", async () => {
      mockOps.deleteShop.mockRejectedValue(new Error("DB error"));

      const mockAuth = createMockAuthenticate({
        topic: "SHOP_REDACT",
        payload: { shop_domain: "test-store.myshopify.com" },
      });
      const action = createGDPRAction(mockAuth, mockOps);
      const response = await action({ request: new Request("http://localhost") });

      expect(response.status).toBe(200);
    });
  });

  // ─── Unknown topic ────────────────────────────────────────────────────

  describe("unknown topic", () => {
    it("returns 200 for an unknown GDPR topic", async () => {
      const mockAuth = createMockAuthenticate({
        topic: "UNKNOWN_GDPR_TOPIC",
        payload: {},
      });
      const action = createGDPRAction(mockAuth, mockOps);
      const response = await action({ request: new Request("http://localhost") });

      expect(response.status).toBe(200);
      expect(mockOps.deleteShop).not.toHaveBeenCalled();
    });
  });

  // ─── Invalid payload ──────────────────────────────────────────────────

  describe("invalid payload", () => {
    it("returns 200 even with invalid payload (Shopify expects 200)", async () => {
      const mockAuth = createMockAuthenticate({
        topic: "SHOP_REDACT",
        payload: "not-an-object",
      });
      const action = createGDPRAction(mockAuth, mockOps);
      const response = await action({ request: new Request("http://localhost") });

      expect(response.status).toBe(200);
      expect(mockOps.deleteShop).not.toHaveBeenCalled();
    });

    it("returns 200 with null payload", async () => {
      const mockAuth = createMockAuthenticate({
        topic: "CUSTOMERS_DATA_REQUEST",
        payload: null,
      });
      const action = createGDPRAction(mockAuth, mockOps);
      const response = await action({ request: new Request("http://localhost") });

      expect(response.status).toBe(200);
    });
  });
});
