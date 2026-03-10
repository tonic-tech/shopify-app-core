import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBillingConfig } from "../../src/billing/config.js";
import { requirePlan } from "../../src/billing/middleware.js";

// Mock logger
vi.mock("../../src/logger.server.js", () => ({
  logger: {
    billing: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const billing = createBillingConfig({
  BUILD: { amount: 9.99, features: ["blocks", "forms"] },
  OPTIMIZE: { amount: 29.99, features: ["blocks", "forms", "analytics"] },
  ENTERPRISE: { amount: 99.99, features: ["*"] },
});

describe("requirePlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("plan-based gating", () => {
    it("allows access when on a required plan", async () => {
      const result = await requirePlan("test.myshopify.com", {
        plans: ["OPTIMIZE", "ENTERPRISE"],
        getShopPlan: async () => "OPTIMIZE",
        billingConfig: billing,
        upgradeUrl: "/app/billing",
      });

      expect(result.currentPlan).toBe("OPTIMIZE");
      expect(result.authorized).toBe(true);
    });

    it("throws redirect when on wrong plan", async () => {
      try {
        await requirePlan("test.myshopify.com", {
          plans: ["OPTIMIZE", "ENTERPRISE"],
          getShopPlan: async () => "BUILD",
          billingConfig: billing,
          upgradeUrl: "/app/billing",
        });
        expect.fail("Should have thrown");
      } catch (response) {
        expect(response).toBeInstanceOf(Response);
        expect((response as Response).status).toBe(302);
        expect((response as Response).headers.get("Location")).toBe("/app/billing");
      }
    });

    it("throws redirect for FREE plan", async () => {
      try {
        await requirePlan("test.myshopify.com", {
          plans: ["BUILD"],
          getShopPlan: async () => "FREE",
          billingConfig: billing,
          upgradeUrl: "/app/billing",
        });
        expect.fail("Should have thrown");
      } catch (response) {
        expect((response as Response).status).toBe(302);
      }
    });
  });

  describe("feature-based gating", () => {
    it("allows access when plan has required features", async () => {
      const result = await requirePlan("test.myshopify.com", {
        features: ["blocks", "forms"],
        getShopPlan: async () => "BUILD",
        billingConfig: billing,
        upgradeUrl: "/app/billing",
      });

      expect(result.authorized).toBe(true);
    });

    it("denies access when plan lacks a feature", async () => {
      try {
        await requirePlan("test.myshopify.com", {
          features: ["analytics"],
          getShopPlan: async () => "BUILD",
          billingConfig: billing,
          upgradeUrl: "/app/billing",
        });
        expect.fail("Should have thrown");
      } catch (response) {
        expect((response as Response).status).toBe(302);
      }
    });

    it("wildcard plan passes any feature check", async () => {
      const result = await requirePlan("test.myshopify.com", {
        features: ["analytics", "anything-else"],
        getShopPlan: async () => "ENTERPRISE",
        billingConfig: billing,
        upgradeUrl: "/app/billing",
      });

      expect(result.authorized).toBe(true);
    });

    it("requires ALL features (AND logic)", async () => {
      try {
        await requirePlan("test.myshopify.com", {
          features: ["blocks", "analytics"],
          getShopPlan: async () => "BUILD",
          billingConfig: billing,
          upgradeUrl: "/app/billing",
        });
        expect.fail("Should have thrown");
      } catch (response) {
        expect((response as Response).status).toBe(302);
      }
    });
  });

  describe("no restrictions", () => {
    it("allows access when no plans or features specified", async () => {
      const result = await requirePlan("test.myshopify.com", {
        getShopPlan: async () => "FREE",
        billingConfig: billing,
        upgradeUrl: "/app/billing",
      });

      expect(result.authorized).toBe(true);
      expect(result.currentPlan).toBe("FREE");
    });
  });
});
