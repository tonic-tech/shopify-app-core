import { describe, it, expect, vi, beforeEach } from "vitest";
import { createUsageRecord } from "../../src/billing/usage.js";

vi.mock("../../src/logger.server.js", () => ({
  logger: {
    billing: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

function createMockAdmin(responseData: unknown) {
  return {
    graphql: vi.fn().mockResolvedValue({
      json: () => Promise.resolve(responseData),
    }),
  };
}

describe("createUsageRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a usage record successfully", async () => {
    const admin = createMockAdmin({
      data: {
        appUsageRecordCreate: {
          appUsageRecord: { id: "gid://shopify/AppUsageRecord/123" },
          userErrors: [],
        },
      },
    });

    const result = await createUsageRecord(admin, {
      subscriptionLineItemId: "gid://shopify/AppSubscriptionLineItem/456",
      amount: 0.50,
      description: "50 API calls",
      idempotencyKey: "test-key-1",
    });

    expect(result.success).toBe(true);
    expect(result.usageRecordId).toBe("gid://shopify/AppUsageRecord/123");
    expect(admin.graphql).toHaveBeenCalledOnce();
  });

  it("handles capped amount exceeded", async () => {
    const admin = createMockAdmin({
      data: {
        appUsageRecordCreate: {
          appUsageRecord: null,
          userErrors: [{ field: "price", message: "Usage record would exceed capped amount" }],
        },
      },
    });

    const result = await createUsageRecord(admin, {
      subscriptionLineItemId: "gid://shopify/AppSubscriptionLineItem/456",
      amount: 999,
      description: "Large usage",
    });

    expect(result.success).toBe(false);
    expect(result.cappedAmountExceeded).toBe(true);
  });

  it("handles generic user errors", async () => {
    const admin = createMockAdmin({
      data: {
        appUsageRecordCreate: {
          appUsageRecord: null,
          userErrors: [{ field: "subscriptionLineItemId", message: "Not found" }],
        },
      },
    });

    const result = await createUsageRecord(admin, {
      subscriptionLineItemId: "invalid-id",
      amount: 1,
      description: "test",
    });

    expect(result.success).toBe(false);
    expect(result.cappedAmountExceeded).toBeFalsy();
    expect(result.error).toContain("Not found");
  });

  it("handles network/GraphQL errors", async () => {
    const admin = {
      graphql: vi.fn().mockRejectedValue(new Error("Network error")),
    };

    const result = await createUsageRecord(admin, {
      subscriptionLineItemId: "gid://shopify/AppSubscriptionLineItem/456",
      amount: 1,
      description: "test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Network error");
  });

  it("passes idempotency key when provided", async () => {
    const admin = createMockAdmin({
      data: {
        appUsageRecordCreate: {
          appUsageRecord: { id: "gid://shopify/AppUsageRecord/789" },
          userErrors: [],
        },
      },
    });

    await createUsageRecord(admin, {
      subscriptionLineItemId: "gid://shopify/AppSubscriptionLineItem/456",
      amount: 0.10,
      description: "10 calls",
      idempotencyKey: "unique-key",
    });

    const callArgs = admin.graphql.mock.calls[0];
    expect(callArgs[1].variables.idempotencyKey).toBe("unique-key");
  });

  it("defaults currency to USD", async () => {
    const admin = createMockAdmin({
      data: {
        appUsageRecordCreate: {
          appUsageRecord: { id: "test" },
          userErrors: [],
        },
      },
    });

    await createUsageRecord(admin, {
      subscriptionLineItemId: "gid://shopify/AppSubscriptionLineItem/456",
      amount: 1,
      description: "test",
    });

    const callArgs = admin.graphql.mock.calls[0];
    expect(callArgs[1].variables.price.currencyCode).toBe("USD");
  });
});
