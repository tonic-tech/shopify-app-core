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

  it("uses custom currencyCode when provided", async () => {
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
      currencyCode: "EUR",
      description: "test",
    });

    const callArgs = admin.graphql.mock.calls[0];
    expect(callArgs[1].variables.price.currencyCode).toBe("EUR");
  });

  it("omits idempotencyKey from variables when not provided", async () => {
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
    expect(callArgs[1].variables.idempotencyKey).toBeUndefined();
  });

  it("handles non-Error thrown exceptions", async () => {
    const admin = {
      graphql: vi.fn().mockRejectedValue("string error"),
    };

    const result = await createUsageRecord(admin, {
      subscriptionLineItemId: "gid://shopify/AppSubscriptionLineItem/456",
      amount: 1,
      description: "test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unknown error");
  });

  it("returns error when response data is null", async () => {
    const admin = createMockAdmin({
      data: null,
    });

    const result = await createUsageRecord(admin, {
      subscriptionLineItemId: "gid://shopify/AppSubscriptionLineItem/456",
      amount: 1,
      description: "test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("No usage record ID returned");
  });

  it("returns error when response object is empty", async () => {
    const admin = createMockAdmin({});

    const result = await createUsageRecord(admin, {
      subscriptionLineItemId: "gid://shopify/AppSubscriptionLineItem/456",
      amount: 1,
      description: "test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("No usage record ID returned");
  });

  it("detects capped amount via 'exceed' keyword in error message", async () => {
    const admin = createMockAdmin({
      data: {
        appUsageRecordCreate: {
          appUsageRecord: null,
          userErrors: [{ field: "price", message: "Amount would exceed the balance" }],
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

  it("concatenates multiple user errors into a single error string", async () => {
    const admin = createMockAdmin({
      data: {
        appUsageRecordCreate: {
          appUsageRecord: null,
          userErrors: [
            { field: "price", message: "Invalid amount" },
            { field: "description", message: "Description required" },
          ],
        },
      },
    });

    const result = await createUsageRecord(admin, {
      subscriptionLineItemId: "gid://shopify/AppSubscriptionLineItem/456",
      amount: -1,
      description: "",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid amount, Description required");
  });
});
