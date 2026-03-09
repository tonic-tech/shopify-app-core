import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SubscriptionPayloadSchema,
  GDPRPayloadSchema,
  ChargeIdSchema,
  validateChargeId,
  createPlanValidator,
  validateSubscriptionPayload,
  validateGDPRPayload,
} from "../src/validation.server.js";

// ─── SubscriptionPayloadSchema ───────────────────────────────────────────────

describe("SubscriptionPayloadSchema", () => {
  it("accepts a valid payload with app_subscription", () => {
    const payload = {
      app_subscription: {
        name: "PRO",
        status: "ACTIVE",
        admin_graphql_api_id: "gid://shopify/AppSubscription/12345",
      },
    };
    const result = SubscriptionPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.app_subscription?.name).toBe("PRO");
    }
  });

  it("accepts a payload without app_subscription (field is optional)", () => {
    const result = SubscriptionPayloadSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.app_subscription).toBeUndefined();
    }
  });

  it("rejects payload where app_subscription has missing required fields", () => {
    const result = SubscriptionPayloadSchema.safeParse({
      app_subscription: { name: "PRO" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects payload where app_subscription fields are wrong types", () => {
    const result = SubscriptionPayloadSchema.safeParse({
      app_subscription: {
        name: 123,
        status: "ACTIVE",
        admin_graphql_api_id: "gid://shopify/AppSubscription/1",
      },
    });
    expect(result.success).toBe(false);
  });
});

// ─── GDPRPayloadSchema ──────────────────────────────────────────────────────

describe("GDPRPayloadSchema", () => {
  it("accepts a full GDPR payload with all optional fields", () => {
    const payload = {
      shop_id: 12345,
      shop_domain: "test-store.myshopify.com",
      orders_requested: [1, 2, 3],
      customer: { id: 100, email: "test@example.com", phone: "+1234567890" },
      orders_to_redact: [4, 5],
      data_request: { id: 999 },
    };
    const result = GDPRPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("accepts an empty object (all fields are optional)", () => {
    const result = GDPRPayloadSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts payload with only shop_domain", () => {
    const result = GDPRPayloadSchema.safeParse({ shop_domain: "store.myshopify.com" });
    expect(result.success).toBe(true);
  });

  it("rejects payload where customer.id is not a number", () => {
    const result = GDPRPayloadSchema.safeParse({
      customer: { id: "not-a-number", email: "a@b.com" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects payload where orders_requested contains non-numbers", () => {
    const result = GDPRPayloadSchema.safeParse({
      orders_requested: ["abc"],
    });
    expect(result.success).toBe(false);
  });
});

// ─── ChargeIdSchema ─────────────────────────────────────────────────────────

describe("ChargeIdSchema", () => {
  it("accepts a valid GID format", () => {
    const result = ChargeIdSchema.safeParse("gid://shopify/AppSubscription/12345");
    expect(result.success).toBe(true);
  });

  it("accepts a plain numeric string", () => {
    const result = ChargeIdSchema.safeParse("12345");
    expect(result.success).toBe(true);
  });

  it("rejects an empty string", () => {
    const result = ChargeIdSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("rejects a random string that is not a GID or numeric", () => {
    const result = ChargeIdSchema.safeParse("some-random-string");
    expect(result.success).toBe(false);
  });

  it("rejects a GID with wrong resource type", () => {
    const result = ChargeIdSchema.safeParse("gid://shopify/Product/12345");
    expect(result.success).toBe(false);
  });

  it("rejects a GID with trailing characters", () => {
    const result = ChargeIdSchema.safeParse("gid://shopify/AppSubscription/12345abc");
    expect(result.success).toBe(false);
  });

  it("rejects a numeric string with decimal", () => {
    const result = ChargeIdSchema.safeParse("123.45");
    expect(result.success).toBe(false);
  });

  it("rejects a numeric string with leading dash (negative)", () => {
    const result = ChargeIdSchema.safeParse("-12345");
    expect(result.success).toBe(false);
  });
});

// ─── validateChargeId ───────────────────────────────────────────────────────

describe("validateChargeId", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("returns the charge_id for a valid GID", () => {
    expect(validateChargeId("gid://shopify/AppSubscription/99")).toBe(
      "gid://shopify/AppSubscription/99"
    );
  });

  it("returns the charge_id for a plain numeric string", () => {
    expect(validateChargeId("42")).toBe("42");
  });

  it("returns null for an empty string", () => {
    expect(validateChargeId("")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(validateChargeId(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(validateChargeId(undefined)).toBeNull();
  });

  it("returns null for a number (non-string)", () => {
    expect(validateChargeId(123)).toBeNull();
  });

  it("returns null and warns for an invalid format", () => {
    expect(validateChargeId("invalid")).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Invalid charge_id format")
    );
  });
});

// ─── createPlanValidator ────────────────────────────────────────────────────

describe("createPlanValidator", () => {
  const { validatePlan } = createPlanValidator(["STARTER", "PRO", "ENTERPRISE"] as const);

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("returns the uppercase plan name for a valid plan (lowercase input)", () => {
    expect(validatePlan("pro")).toBe("PRO");
  });

  it("returns the uppercase plan name for a valid plan (uppercase input)", () => {
    expect(validatePlan("STARTER")).toBe("STARTER");
  });

  it("returns the uppercase plan name for mixed case input", () => {
    expect(validatePlan("Enterprise")).toBe("ENTERPRISE");
  });

  it('returns "FREE" for the free plan', () => {
    expect(validatePlan("free")).toBe("FREE");
  });

  it('returns "FREE" for an unknown plan name and warns', () => {
    expect(validatePlan("UNKNOWN_PLAN")).toBe("FREE");
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Invalid plan name received")
    );
  });

  it('returns "FREE" for non-string input and warns', () => {
    expect(validatePlan(42)).toBe("FREE");
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Invalid plan type received")
    );
  });

  it('returns "FREE" for null input', () => {
    expect(validatePlan(null)).toBe("FREE");
  });

  it('returns "FREE" for undefined input', () => {
    expect(validatePlan(undefined)).toBe("FREE");
  });

  it("works with a different set of valid plans", () => {
    const { validatePlan: vp } = createPlanValidator(["BUILD", "OPTIMIZE"] as const);
    expect(vp("build")).toBe("BUILD");
    expect(vp("optimize")).toBe("OPTIMIZE");
    expect(vp("pro")).toBe("FREE");
  });
});

// ─── validateSubscriptionPayload ────────────────────────────────────────────

describe("validateSubscriptionPayload", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns parsed data for a valid payload", () => {
    const payload = {
      app_subscription: {
        name: "PRO",
        status: "ACTIVE",
        admin_graphql_api_id: "gid://shopify/AppSubscription/1",
      },
    };
    const result = validateSubscriptionPayload(payload);
    expect(result).not.toBeNull();
    expect(result?.app_subscription?.name).toBe("PRO");
  });

  it("returns data with undefined app_subscription for empty object", () => {
    const result = validateSubscriptionPayload({});
    expect(result).not.toBeNull();
    expect(result?.app_subscription).toBeUndefined();
  });

  it("returns null for completely invalid data and logs error", () => {
    const result = validateSubscriptionPayload("not an object");
    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it("returns null when app_subscription has wrong field types", () => {
    const result = validateSubscriptionPayload({
      app_subscription: { name: 123, status: true, admin_graphql_api_id: null },
    });
    expect(result).toBeNull();
  });
});

// ─── validateGDPRPayload ────────────────────────────────────────────────────

describe("validateGDPRPayload", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns parsed data for a valid GDPR payload", () => {
    const payload = {
      shop_id: 1,
      shop_domain: "store.myshopify.com",
      customer: { id: 42, email: "user@example.com" },
    };
    const result = validateGDPRPayload(payload);
    expect(result).not.toBeNull();
    expect(result?.shop_domain).toBe("store.myshopify.com");
  });

  it("returns parsed data for an empty object", () => {
    const result = validateGDPRPayload({});
    expect(result).not.toBeNull();
  });

  it("returns null for a non-object input and logs error", () => {
    const result = validateGDPRPayload(42);
    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it("returns null for null input", () => {
    const result = validateGDPRPayload(null);
    expect(result).toBeNull();
  });
});
