import { describe, it, expect, vi, beforeEach } from "vitest";
import { createChargeConfirmationLoader } from "../../src/billing/confirmation.js";

// Mock logger
vi.mock("../../src/logger.server.js", () => ({
  logger: {
    billing: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock metafields
vi.mock("../../src/metafields.server.js", () => ({
  syncPlanMetafield: vi.fn().mockResolvedValue(undefined),
}));

import { syncPlanMetafield } from "../../src/metafields.server.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockAuthenticate(overrides?: {
  billingCheck?: () => Promise<unknown>;
  billingCheckError?: Error;
}) {
  const mockAdmin = {
    graphql: vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) }),
  };

  const defaultBillingCheck = vi.fn().mockResolvedValue({
    hasActivePayment: true,
    appSubscriptions: [
      { id: "gid://shopify/AppSubscription/1", name: "BUILD", status: "ACTIVE", test: false },
    ],
  });

  const billingCheck = overrides?.billingCheckError
    ? vi.fn().mockRejectedValue(overrides.billingCheckError)
    : overrides?.billingCheck ?? defaultBillingCheck;

  return {
    admin: vi.fn().mockResolvedValue({
      session: { shop: "test-store.myshopify.com" },
      admin: mockAdmin,
      billing: { check: billingCheck },
    }),
  };
}

function createMockOps() {
  return {
    onChargeConfirmed: vi.fn().mockResolvedValue(undefined),
    onChargeDeclined: vi.fn().mockResolvedValue(undefined),
  };
}

function makeRequest() {
  return new Request("http://localhost/app/billing/confirm?charge_id=123");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createChargeConfirmationLoader", () => {
  let mockAuth: ReturnType<typeof createMockAuthenticate>;
  let mockOps: ReturnType<typeof createMockOps>;

  beforeEach(() => {
    mockAuth = createMockAuthenticate();
    mockOps = createMockOps();
    vi.clearAllMocks();
  });

  // ─── Happy path: charge confirmed ──────────────────────────────────────

  describe("charge confirmed", () => {
    it("calls onChargeConfirmed with shop, plan, and subscriptionId", async () => {
      const loader = createChargeConfirmationLoader(mockAuth, mockOps, {
        namespace: "blocktonic",
      });

      try {
        await loader({ request: makeRequest() });
        expect.fail("Should have thrown a redirect");
      } catch (response) {
        // Redirect is expected
        expect(response).toBeInstanceOf(Response);
      }

      expect(mockOps.onChargeConfirmed).toHaveBeenCalledWith(
        "test-store.myshopify.com",
        "BUILD",
        "gid://shopify/AppSubscription/1"
      );
    });

    it("redirects to /app by default on success", async () => {
      const loader = createChargeConfirmationLoader(mockAuth, mockOps, {
        namespace: "blocktonic",
      });

      try {
        await loader({ request: makeRequest() });
        expect.fail("Should have thrown a redirect");
      } catch (response) {
        expect(response).toBeInstanceOf(Response);
        expect((response as Response).status).toBe(302);
        expect((response as Response).headers.get("Location")).toBe("/app");
      }
    });

    it("redirects to custom successRedirectUrl when configured", async () => {
      const loader = createChargeConfirmationLoader(mockAuth, mockOps, {
        namespace: "blocktonic",
        successRedirectUrl: "/app/dashboard",
      });

      try {
        await loader({ request: makeRequest() });
        expect.fail("Should have thrown a redirect");
      } catch (response) {
        expect((response as Response).headers.get("Location")).toBe("/app/dashboard");
      }
    });

    it("syncs plan metafield after confirmation", async () => {
      const loader = createChargeConfirmationLoader(mockAuth, mockOps, {
        namespace: "blocktonic",
      });

      try {
        await loader({ request: makeRequest() });
      } catch {
        // redirect expected
      }

      expect(syncPlanMetafield).toHaveBeenCalledWith(
        expect.objectContaining({ graphql: expect.any(Function) }),
        "blocktonic",
        "BUILD"
      );
    });

    it("still redirects to success even if metafield sync fails (best-effort)", async () => {
      vi.mocked(syncPlanMetafield).mockRejectedValueOnce(new Error("Metafield sync failed"));

      const loader = createChargeConfirmationLoader(mockAuth, mockOps, {
        namespace: "blocktonic",
      });

      try {
        await loader({ request: makeRequest() });
        expect.fail("Should have thrown a redirect");
      } catch (response) {
        expect((response as Response).headers.get("Location")).toBe("/app");
      }
    });

    it("still redirects to success even if onChargeConfirmed throws (best-effort)", async () => {
      mockOps.onChargeConfirmed.mockRejectedValueOnce(new Error("DB write failed"));

      const loader = createChargeConfirmationLoader(mockAuth, mockOps, {
        namespace: "blocktonic",
      });

      try {
        await loader({ request: makeRequest() });
        expect.fail("Should have thrown a redirect");
      } catch (response) {
        // Should still redirect to success because we caught the error
        expect((response as Response).headers.get("Location")).toBe("/app");
      }
    });

    it("picks the first subscription from the array", async () => {
      const multiSubAuth = createMockAuthenticate({
        billingCheck: vi.fn().mockResolvedValue({
          hasActivePayment: true,
          appSubscriptions: [
            { id: "gid://shopify/AppSubscription/1", name: "OPTIMIZE", status: "ACTIVE", test: false },
            { id: "gid://shopify/AppSubscription/2", name: "BUILD", status: "ACTIVE", test: false },
          ],
        }),
      });

      const loader = createChargeConfirmationLoader(multiSubAuth, mockOps, {
        namespace: "blocktonic",
      });

      try {
        await loader({ request: makeRequest() });
      } catch {
        // redirect expected
      }

      expect(mockOps.onChargeConfirmed).toHaveBeenCalledWith(
        "test-store.myshopify.com",
        "OPTIMIZE",
        "gid://shopify/AppSubscription/1"
      );
    });

    it("prefers ACTIVE subscription over PENDING ones", async () => {
      const mixedAuth = createMockAuthenticate({
        billingCheck: vi.fn().mockResolvedValue({
          hasActivePayment: true,
          appSubscriptions: [
            { id: "gid://shopify/AppSubscription/1", name: "BUILD", status: "PENDING", test: false },
            { id: "gid://shopify/AppSubscription/2", name: "OPTIMIZE", status: "ACTIVE", test: false },
          ],
        }),
      });

      const loader = createChargeConfirmationLoader(mixedAuth, mockOps, {
        namespace: "blocktonic",
      });

      try {
        await loader({ request: makeRequest() });
      } catch {
        // redirect expected
      }

      expect(mockOps.onChargeConfirmed).toHaveBeenCalledWith(
        "test-store.myshopify.com",
        "OPTIMIZE",
        "gid://shopify/AppSubscription/2"
      );
    });

    it("falls back to first subscription when none are ACTIVE", async () => {
      const pendingAuth = createMockAuthenticate({
        billingCheck: vi.fn().mockResolvedValue({
          hasActivePayment: true,
          appSubscriptions: [
            { id: "gid://shopify/AppSubscription/1", name: "BUILD", status: "PENDING", test: false },
            { id: "gid://shopify/AppSubscription/2", name: "OPTIMIZE", status: "PENDING", test: false },
          ],
        }),
      });

      const loader = createChargeConfirmationLoader(pendingAuth, mockOps, {
        namespace: "blocktonic",
      });

      try {
        await loader({ request: makeRequest() });
      } catch {
        // redirect expected
      }

      expect(mockOps.onChargeConfirmed).toHaveBeenCalledWith(
        "test-store.myshopify.com",
        "BUILD",
        "gid://shopify/AppSubscription/1"
      );
    });
  });

  // ─── Charge declined ──────────────────────────────────────────────────

  describe("charge declined", () => {
    it("calls onChargeDeclined when no active payment", async () => {
      const declinedAuth = createMockAuthenticate({
        billingCheck: vi.fn().mockResolvedValue({
          hasActivePayment: false,
          appSubscriptions: [],
        }),
      });

      const loader = createChargeConfirmationLoader(declinedAuth, mockOps, {
        namespace: "blocktonic",
      });

      try {
        await loader({ request: makeRequest() });
        expect.fail("Should have thrown a redirect");
      } catch (response) {
        expect(response).toBeInstanceOf(Response);
      }

      expect(mockOps.onChargeDeclined).toHaveBeenCalledWith("test-store.myshopify.com");
      expect(mockOps.onChargeConfirmed).not.toHaveBeenCalled();
    });

    it("redirects to /app/billing by default on decline", async () => {
      const declinedAuth = createMockAuthenticate({
        billingCheck: vi.fn().mockResolvedValue({
          hasActivePayment: false,
          appSubscriptions: [],
        }),
      });

      const loader = createChargeConfirmationLoader(declinedAuth, mockOps, {
        namespace: "blocktonic",
      });

      try {
        await loader({ request: makeRequest() });
        expect.fail("Should have thrown a redirect");
      } catch (response) {
        expect((response as Response).headers.get("Location")).toBe("/app/billing");
      }
    });

    it("redirects to custom declinedRedirectUrl when configured", async () => {
      const declinedAuth = createMockAuthenticate({
        billingCheck: vi.fn().mockResolvedValue({
          hasActivePayment: false,
          appSubscriptions: [],
        }),
      });

      const loader = createChargeConfirmationLoader(declinedAuth, mockOps, {
        namespace: "blocktonic",
        declinedRedirectUrl: "/app/billing/plans",
      });

      try {
        await loader({ request: makeRequest() });
        expect.fail("Should have thrown a redirect");
      } catch (response) {
        expect((response as Response).headers.get("Location")).toBe("/app/billing/plans");
      }
    });

    it("treats hasActivePayment:true with empty subscriptions as declined", async () => {
      const emptySubAuth = createMockAuthenticate({
        billingCheck: vi.fn().mockResolvedValue({
          hasActivePayment: true,
          appSubscriptions: [],
        }),
      });

      const loader = createChargeConfirmationLoader(emptySubAuth, mockOps, {
        namespace: "blocktonic",
      });

      try {
        await loader({ request: makeRequest() });
        expect.fail("Should have thrown a redirect");
      } catch (response) {
        expect((response as Response).headers.get("Location")).toBe("/app/billing");
      }

      expect(mockOps.onChargeDeclined).toHaveBeenCalled();
      expect(mockOps.onChargeConfirmed).not.toHaveBeenCalled();
    });

    it("still redirects to declined URL even if onChargeDeclined throws", async () => {
      const declinedAuth = createMockAuthenticate({
        billingCheck: vi.fn().mockResolvedValue({
          hasActivePayment: false,
          appSubscriptions: [],
        }),
      });

      mockOps.onChargeDeclined.mockRejectedValueOnce(new Error("DB error"));

      const loader = createChargeConfirmationLoader(declinedAuth, mockOps, {
        namespace: "blocktonic",
      });

      try {
        await loader({ request: makeRequest() });
        expect.fail("Should have thrown a redirect");
      } catch (response) {
        expect((response as Response).headers.get("Location")).toBe("/app/billing");
      }
    });
  });

  // ─── billing.check() failure ──────────────────────────────────────────

  describe("billing check failure", () => {
    it("redirects to declined URL when billing.check() throws", async () => {
      const errorAuth = createMockAuthenticate({
        billingCheckError: new Error("Shopify API down"),
      });

      const loader = createChargeConfirmationLoader(errorAuth, mockOps, {
        namespace: "blocktonic",
      });

      try {
        await loader({ request: makeRequest() });
        expect.fail("Should have thrown a redirect");
      } catch (response) {
        expect((response as Response).headers.get("Location")).toBe("/app/billing");
      }

      expect(mockOps.onChargeConfirmed).not.toHaveBeenCalled();
      expect(mockOps.onChargeDeclined).not.toHaveBeenCalled();
    });

    it("redirects to custom declined URL when billing.check() throws", async () => {
      const errorAuth = createMockAuthenticate({
        billingCheckError: new Error("API timeout"),
      });

      const loader = createChargeConfirmationLoader(errorAuth, mockOps, {
        namespace: "blocktonic",
        declinedRedirectUrl: "/app/error",
      });

      try {
        await loader({ request: makeRequest() });
        expect.fail("Should have thrown a redirect");
      } catch (response) {
        expect((response as Response).headers.get("Location")).toBe("/app/error");
      }
    });
  });

  // ─── TonicLink integration ────────────────────────────────────────────

  describe("TonicLink integration", () => {
    it("reports plan change to TonicLink when configured", async () => {
      const mockTonicLink = {
        configured: true,
        reportPlanChange: vi.fn().mockResolvedValue({ status: "updated" }),
      };

      const loader = createChargeConfirmationLoader(mockAuth, mockOps, {
        namespace: "blocktonic",
        appName: "blocktonic" as any,
        tonicLink: mockTonicLink as any,
      });

      try {
        await loader({ request: makeRequest() });
      } catch {
        // redirect expected
      }

      expect(mockTonicLink.reportPlanChange).toHaveBeenCalledWith(
        "test-store.myshopify.com",
        "blocktonic",
        "BUILD",
        "ACTIVE"
      );
    });

    it("does not report to TonicLink when not configured", async () => {
      const mockTonicLink = {
        configured: false,
        reportPlanChange: vi.fn(),
      };

      const loader = createChargeConfirmationLoader(mockAuth, mockOps, {
        namespace: "blocktonic",
        appName: "blocktonic" as any,
        tonicLink: mockTonicLink as any,
      });

      try {
        await loader({ request: makeRequest() });
      } catch {
        // redirect expected
      }

      expect(mockTonicLink.reportPlanChange).not.toHaveBeenCalled();
    });

    it("does not report to TonicLink when appName is not provided", async () => {
      const mockTonicLink = {
        configured: true,
        reportPlanChange: vi.fn(),
      };

      const loader = createChargeConfirmationLoader(mockAuth, mockOps, {
        namespace: "blocktonic",
        tonicLink: mockTonicLink as any,
        // no appName
      });

      try {
        await loader({ request: makeRequest() });
      } catch {
        // redirect expected
      }

      expect(mockTonicLink.reportPlanChange).not.toHaveBeenCalled();
    });

    it("still redirects to success even if TonicLink report fails", async () => {
      const mockTonicLink = {
        configured: true,
        reportPlanChange: vi.fn().mockRejectedValue(new Error("Network error")),
      };

      const loader = createChargeConfirmationLoader(mockAuth, mockOps, {
        namespace: "blocktonic",
        appName: "blocktonic" as any,
        tonicLink: mockTonicLink as any,
      });

      try {
        await loader({ request: makeRequest() });
        expect.fail("Should have thrown a redirect");
      } catch (response) {
        expect((response as Response).headers.get("Location")).toBe("/app");
      }
    });
  });

  // ─── authenticate.admin failure ───────────────────────────────────────

  describe("authentication failure", () => {
    it("propagates error when authenticate.admin throws", async () => {
      const brokenAuth = {
        admin: vi.fn().mockRejectedValue(new Error("Session expired")),
      };

      const loader = createChargeConfirmationLoader(brokenAuth, mockOps, {
        namespace: "blocktonic",
      });

      await expect(loader({ request: makeRequest() })).rejects.toThrow("Session expired");
      expect(mockOps.onChargeConfirmed).not.toHaveBeenCalled();
      expect(mockOps.onChargeDeclined).not.toHaveBeenCalled();
    });
  });
});
