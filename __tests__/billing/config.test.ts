import { describe, it, expect } from "vitest";
import { createBillingConfig } from "../../src/billing/config.js";

describe("createBillingConfig", () => {
  const billing = createBillingConfig({
    BUILD: { amount: 9.99, trialDays: 7, features: ["blocks", "forms"] },
    OPTIMIZE: { amount: 29.99, trialDays: 7, features: ["blocks", "forms", "analytics", "ab-testing"] },
    ENTERPRISE: { amount: 99.99, trialDays: 14, features: ["*"] },
  });

  describe("plan resolution", () => {
    it("auto-adds FREE plan", () => {
      expect(billing.plans.FREE).toBeDefined();
      expect(billing.plans.FREE.amount).toBe(0);
      expect(billing.plans.FREE.features).toEqual([]);
    });

    it("resolves plan defaults", () => {
      const build = billing.plans.BUILD;
      expect(build.name).toBe("BUILD");
      expect(build.amount).toBe(9.99);
      expect(build.currencyCode).toBe("USD");
      expect(build.interval).toBe("EVERY_30_DAYS");
      expect(build.trialDays).toBe(7);
      expect(build.isUsageBased).toBe(false);
    });

    it("tracks paid plan names", () => {
      expect(billing.planNames).toEqual(["BUILD", "OPTIMIZE", "ENTERPRISE"]);
    });

    it("tracks all plan names including FREE", () => {
      expect(billing.allPlanNames).toContain("FREE");
      expect(billing.allPlanNames).toContain("BUILD");
      expect(billing.allPlanNames.length).toBe(4);
    });
  });

  describe("getPlan", () => {
    it("returns resolved plan by name", () => {
      expect(billing.getPlan("BUILD").amount).toBe(9.99);
    });

    it("is case-insensitive", () => {
      expect(billing.getPlan("build").amount).toBe(9.99);
      expect(billing.getPlan("Build").amount).toBe(9.99);
    });

    it("returns FREE for unknown plans", () => {
      expect(billing.getPlan("NONEXISTENT").amount).toBe(0);
      expect(billing.getPlan("NONEXISTENT").name).toBe("FREE");
    });
  });

  describe("hasFeature", () => {
    it("returns true for included features", () => {
      expect(billing.hasFeature("BUILD", "blocks")).toBe(true);
      expect(billing.hasFeature("BUILD", "forms")).toBe(true);
    });

    it("returns false for excluded features", () => {
      expect(billing.hasFeature("BUILD", "analytics")).toBe(false);
    });

    it("wildcard plan includes all features", () => {
      expect(billing.hasFeature("ENTERPRISE", "analytics")).toBe(true);
      expect(billing.hasFeature("ENTERPRISE", "anything-at-all")).toBe(true);
    });

    it("FREE plan has no features", () => {
      expect(billing.hasFeature("FREE", "blocks")).toBe(false);
    });
  });

  describe("toShopifyBilling", () => {
    it("excludes FREE plan", () => {
      const shopify = billing.toShopifyBilling();
      expect(shopify["FREE"]).toBeUndefined();
    });

    it("produces correct shape for paid plans", () => {
      const shopify = billing.toShopifyBilling();
      expect(shopify["BUILD"]).toEqual({
        lineItems: [{ amount: 9.99, currencyCode: "USD", interval: "EVERY_30_DAYS" }],
        trialDays: 7,
      });
    });

    it("omits trialDays when zero", () => {
      const noTrial = createBillingConfig({
        PRO: { amount: 10 },
      });
      const shopify = noTrial.toShopifyBilling();
      expect(shopify["PRO"].trialDays).toBeUndefined();
    });
  });

  describe("usage-based plans", () => {
    it("resolves usage plans correctly", () => {
      const usageBilling = createBillingConfig({
        METERED: { amount: 100, interval: "USAGE", cappedAmount: 100, terms: "Per API call", features: ["api"] },
      });

      const metered = usageBilling.plans.METERED;
      expect(metered.isUsageBased).toBe(true);
      expect(metered.cappedAmount).toBe(100);
      expect(metered.terms).toBe("Per API call");
    });

    it("includes terms in Shopify billing output", () => {
      const usageBilling = createBillingConfig({
        METERED: { amount: 100, interval: "USAGE", terms: "Per API call" },
      });
      const shopify = usageBilling.toShopifyBilling();
      expect(shopify["METERED"].lineItems[0].terms).toBe("Per API call");
    });

    it("includes cappedAmount in Shopify billing output for usage plans", () => {
      const usageBilling = createBillingConfig({
        METERED: { amount: 100, interval: "USAGE", cappedAmount: 500, terms: "Per API call" },
      });
      const shopify = usageBilling.toShopifyBilling();
      expect(shopify["METERED"].lineItems[0].cappedAmount).toBe(500);
    });

    it("does not include cappedAmount for non-usage plans", () => {
      const config = createBillingConfig({
        PRO: { amount: 10, cappedAmount: 100 },
      });
      const shopify = config.toShopifyBilling();
      expect(shopify["PRO"].lineItems[0].cappedAmount).toBeUndefined();
    });
  });

  describe("custom FREE plan", () => {
    it("uses custom FREE definition when provided", () => {
      const custom = createBillingConfig({
        FREE: { amount: 0, features: ["basic-blocks"] },
        PRO: { amount: 29.99, features: ["*"] },
      });
      expect(custom.plans.FREE.features).toEqual(["basic-blocks"]);
    });

    it("custom FREE plan is not included in planNames (paid plans only)", () => {
      const custom = createBillingConfig({
        FREE: { amount: 0, features: ["basic-blocks"] },
        PRO: { amount: 29.99, features: ["*"] },
      });
      expect(custom.planNames).toEqual(["PRO"]);
      expect(custom.planNames).not.toContain("FREE");
    });
  });

  describe("annual billing interval", () => {
    it("resolves ANNUAL interval correctly", () => {
      const annual = createBillingConfig({
        YEARLY: { amount: 99.99, interval: "ANNUAL", features: ["all"] },
      });
      expect(annual.plans.YEARLY.interval).toBe("ANNUAL");
      expect(annual.plans.YEARLY.isUsageBased).toBe(false);
    });

    it("includes ANNUAL interval in Shopify billing output", () => {
      const annual = createBillingConfig({
        YEARLY: { amount: 99.99, interval: "ANNUAL" },
      });
      const shopify = annual.toShopifyBilling();
      expect(shopify["YEARLY"].lineItems[0].interval).toBe("ANNUAL");
    });
  });

  describe("free plan at amount 0 forces EVERY_30_DAYS", () => {
    it("ignores provided interval when amount is 0", () => {
      const config = createBillingConfig({
        TRIAL: { amount: 0, interval: "ANNUAL" },
      });
      expect(config.plans.TRIAL.interval).toBe("EVERY_30_DAYS");
    });

    it("amount-0 plans are excluded from toShopifyBilling", () => {
      const config = createBillingConfig({
        BASIC: { amount: 0 },
        PRO: { amount: 10 },
      });
      const shopify = config.toShopifyBilling();
      expect(shopify["BASIC"]).toBeUndefined();
      expect(shopify["PRO"]).toBeDefined();
    });
  });

  describe("usage plan without terms", () => {
    it("does not include terms property when not set", () => {
      const config = createBillingConfig({
        METERED: { amount: 50, interval: "USAGE" },
      });
      const shopify = config.toShopifyBilling();
      expect(shopify["METERED"].lineItems[0].terms).toBeUndefined();
    });
  });

  describe("non-usage plan with terms set (ignored)", () => {
    it("does not include terms for non-usage plans in Shopify output", () => {
      const config = createBillingConfig({
        PRO: { amount: 10, interval: "EVERY_30_DAYS", terms: "should be ignored" },
      });
      const shopify = config.toShopifyBilling();
      expect(shopify["PRO"].lineItems[0].terms).toBeUndefined();
    });
  });

  describe("single plan config", () => {
    it("works with a single paid plan", () => {
      const config = createBillingConfig({
        PRO: { amount: 15, features: ["all"] },
      });
      expect(config.planNames).toEqual(["PRO"]);
      expect(config.allPlanNames).toHaveLength(2); // FREE + PRO
    });
  });

  describe("hasFeature with unknown plan", () => {
    it("falls back to FREE plan features for unknown plan name", () => {
      expect(billing.hasFeature("NONEXISTENT", "blocks")).toBe(false);
    });
  });
});
