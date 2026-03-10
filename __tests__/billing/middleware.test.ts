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

  describe("combined plan and feature checks", () => {
    it("requires BOTH plan match AND feature match", async () => {
      // BUILD has "blocks" and "forms" but not "analytics"
      try {
        await requirePlan("test.myshopify.com", {
          plans: ["BUILD", "OPTIMIZE"],
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

    it("passes when plan matches AND all features are present", async () => {
      const result = await requirePlan("test.myshopify.com", {
        plans: ["OPTIMIZE", "ENTERPRISE"],
        features: ["analytics"],
        getShopPlan: async () => "OPTIMIZE",
        billingConfig: billing,
        upgradeUrl: "/app/billing",
      });

      expect(result.authorized).toBe(true);
    });

    it("fails when plan matches but features do not", async () => {
      try {
        await requirePlan("test.myshopify.com", {
          plans: ["BUILD"],
          features: ["analytics"],
          getShopPlan: async () => "BUILD",
          billingConfig: billing,
          upgradeUrl: "/app/upgrade",
        });
        expect.fail("Should have thrown");
      } catch (response) {
        expect((response as Response).headers.get("Location")).toBe("/app/upgrade");
      }
    });

    it("fails when features match but plan does not", async () => {
      try {
        await requirePlan("test.myshopify.com", {
          plans: ["ENTERPRISE"],
          features: ["blocks"],
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

  describe("error propagation", () => {
    it("propagates errors from getShopPlan", async () => {
      await expect(
        requirePlan("test.myshopify.com", {
          getShopPlan: async () => { throw new Error("DB connection lost"); },
          billingConfig: billing,
          upgradeUrl: "/app/billing",
        })
      ).rejects.toThrow("DB connection lost");
    });
  });

  describe("plan name case sensitivity", () => {
    it("plan check is case-insensitive", async () => {
      const result = await requirePlan("test.myshopify.com", {
        plans: ["build"],
        getShopPlan: async () => "BUILD",
        billingConfig: billing,
        upgradeUrl: "/app/billing",
      });

      expect(result.authorized).toBe(true);
    });
  });

  describe("return value shape", () => {
    it("returns resolvedPlan with full plan details", async () => {
      const result = await requirePlan("test.myshopify.com", {
        getShopPlan: async () => "OPTIMIZE",
        billingConfig: billing,
        upgradeUrl: "/app/billing",
      });

      expect(result.resolvedPlan.name).toBe("OPTIMIZE");
      expect(result.resolvedPlan.amount).toBe(29.99);
      expect(result.resolvedPlan.features).toContain("analytics");
    });
  });
});
