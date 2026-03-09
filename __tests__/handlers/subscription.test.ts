import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the module under test
vi.mock("../../src/sentry.server.js", () => ({
  captureException: vi.fn().mockResolvedValue(null),
  initSentry: vi.fn().mockResolvedValue(false),
}));

vi.mock("../../src/metafields.server.js", () => ({
  syncPlanMetafield: vi.fn().mockResolvedValue([]),
}));

import { createSubscriptionAction } from "../../src/handlers/subscription.js";
import { syncPlanMetafield } from "../../src/metafields.server.js";

function createMockAuthenticate(overrides?: {
  topic?: string;
  payload?: unknown;
  shop?: string;
}) {
  return {
    webhook: vi.fn().mockResolvedValue({
      topic: overrides?.topic ?? "APP_SUBSCRIPTIONS_UPDATE",
      payload: overrides?.payload ?? {
        app_subscription: {
          name: "PRO",
          status: "ACTIVE",
          admin_graphql_api_id: "gid://shopify/AppSubscription/123",
        },
      },
      shop: overrides?.shop ?? "test-store.myshopify.com",
    }),
  };
}

function createMockUnauthenticated() {
  return {
    admin: vi.fn().mockResolvedValue({
      admin: {
        graphql: vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ data: { metafieldsSet: { metafields: [], userErrors: [] } } }))
        ),
      },
    }),
  };
}

function createMockOps() {
  return {
    upsertShopPlan: vi.fn().mockResolvedValue(undefined),
  };
}

const DEFAULT_OPTIONS = {
  planNames: ["PRO", "ENTERPRISE"] as const,
  namespace: "testapp",
} as const;

describe("createSubscriptionAction", () => {
  let mockAuth: ReturnType<typeof createMockAuthenticate>;
  let mockUnauth: ReturnType<typeof createMockUnauthenticated>;
  let mockOps: ReturnType<typeof createMockOps>;

  beforeEach(() => {
    mockAuth = createMockAuthenticate();
    mockUnauth = createMockUnauthenticated();
    mockOps = createMockOps();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns 200 on a valid ACTIVE subscription webhook", async () => {
    const action = createSubscriptionAction(mockAuth, mockUnauth, mockOps, DEFAULT_OPTIONS);
    const response = await action({ request: new Request("http://localhost") });

    expect(response.status).toBe(200);
    expect(mockAuth.webhook).toHaveBeenCalled();
    expect(mockOps.upsertShopPlan).toHaveBeenCalledWith("test-store.myshopify.com", {
      plan: "PRO",
      subscriptionId: "gid://shopify/AppSubscription/123",
      subscriptionStatus: "ACTIVE",
    });
  });

  it("sets plan to FREE when subscription status is not ACTIVE", async () => {
    mockAuth = createMockAuthenticate({
      payload: {
        app_subscription: {
          name: "PRO",
          status: "CANCELLED",
          admin_graphql_api_id: "gid://shopify/AppSubscription/123",
        },
      },
    });

    const action = createSubscriptionAction(mockAuth, mockUnauth, mockOps, DEFAULT_OPTIONS);
    await action({ request: new Request("http://localhost") });

    expect(mockOps.upsertShopPlan).toHaveBeenCalledWith(
      "test-store.myshopify.com",
      expect.objectContaining({ plan: "FREE" })
    );
  });

  it("validates the plan name and defaults to FREE for unknown plans", async () => {
    mockAuth = createMockAuthenticate({
      payload: {
        app_subscription: {
          name: "NONEXISTENT_PLAN",
          status: "ACTIVE",
          admin_graphql_api_id: "gid://shopify/AppSubscription/123",
        },
      },
    });

    const action = createSubscriptionAction(mockAuth, mockUnauth, mockOps, DEFAULT_OPTIONS);
    await action({ request: new Request("http://localhost") });

    expect(mockOps.upsertShopPlan).toHaveBeenCalledWith(
      "test-store.myshopify.com",
      expect.objectContaining({ plan: "FREE" })
    );
  });

  it("returns 400 when payload has no app_subscription", async () => {
    mockAuth = createMockAuthenticate({ payload: {} });

    const action = createSubscriptionAction(mockAuth, mockUnauth, mockOps, DEFAULT_OPTIONS);
    const response = await action({ request: new Request("http://localhost") });

    expect(response.status).toBe(400);
    expect(mockOps.upsertShopPlan).not.toHaveBeenCalled();
  });

  it("returns 400 when payload is an invalid non-object string", async () => {
    mockAuth = createMockAuthenticate({ payload: "not-an-object" });

    const action = createSubscriptionAction(mockAuth, mockUnauth, mockOps, DEFAULT_OPTIONS);
    const response = await action({ request: new Request("http://localhost") });

    // validateSubscriptionPayload returns null for non-objects,
    // then the handler checks for missing app_subscription and returns 400
    expect(response.status).toBe(400);
    expect(mockOps.upsertShopPlan).not.toHaveBeenCalled();
  });

  it("returns 500 when upsertShopPlan throws", async () => {
    mockOps.upsertShopPlan.mockRejectedValue(new Error("DB connection lost"));

    const action = createSubscriptionAction(mockAuth, mockUnauth, mockOps, DEFAULT_OPTIONS);
    const response = await action({ request: new Request("http://localhost") });

    expect(response.status).toBe(500);
  });

  it("syncs plan metafield after successful upsert", async () => {
    const action = createSubscriptionAction(mockAuth, mockUnauth, mockOps, DEFAULT_OPTIONS);
    await action({ request: new Request("http://localhost") });

    expect(mockUnauth.admin).toHaveBeenCalledWith("test-store.myshopify.com");
    expect(syncPlanMetafield).toHaveBeenCalled();
  });

  it("returns 200 even when metafield sync fails (best-effort)", async () => {
    mockUnauth.admin.mockRejectedValue(new Error("Shopify API error"));

    const action = createSubscriptionAction(mockAuth, mockUnauth, mockOps, DEFAULT_OPTIONS);
    const response = await action({ request: new Request("http://localhost") });

    expect(response.status).toBe(200);
  });

  it("reports plan change to TonicLink when configured", async () => {
    const mockTonicLink = {
      configured: true,
      reportPlanChange: vi.fn().mockResolvedValue({ status: "updated", apps: {} }),
      reportUninstall: vi.fn(),
      registerOrLink: vi.fn(),
      getStatus: vi.fn(),
    };

    const action = createSubscriptionAction(mockAuth, mockUnauth, mockOps, {
      ...DEFAULT_OPTIONS,
      appName: "blocktonic",
      tonicLink: mockTonicLink as any,
    });

    await action({ request: new Request("http://localhost") });

    expect(mockTonicLink.reportPlanChange).toHaveBeenCalledWith(
      "test-store.myshopify.com",
      "blocktonic",
      "PRO",
      "ACTIVE"
    );
  });

  it("does not report to TonicLink when not configured", async () => {
    const mockTonicLink = {
      configured: false,
      reportPlanChange: vi.fn(),
    };

    const action = createSubscriptionAction(mockAuth, mockUnauth, mockOps, {
      ...DEFAULT_OPTIONS,
      appName: "blocktonic",
      tonicLink: mockTonicLink as any,
    });

    await action({ request: new Request("http://localhost") });

    expect(mockTonicLink.reportPlanChange).not.toHaveBeenCalled();
  });

  it("does not report to TonicLink when appName is not provided", async () => {
    const mockTonicLink = {
      configured: true,
      reportPlanChange: vi.fn(),
    };

    const action = createSubscriptionAction(mockAuth, mockUnauth, mockOps, {
      ...DEFAULT_OPTIONS,
      tonicLink: mockTonicLink as any,
    });

    await action({ request: new Request("http://localhost") });

    expect(mockTonicLink.reportPlanChange).not.toHaveBeenCalled();
  });

  it("returns 200 even when TonicLink report fails (best-effort)", async () => {
    const mockTonicLink = {
      configured: true,
      reportPlanChange: vi.fn().mockRejectedValue(new Error("Network error")),
    };

    const action = createSubscriptionAction(mockAuth, mockUnauth, mockOps, {
      ...DEFAULT_OPTIONS,
      appName: "flowtonic",
      tonicLink: mockTonicLink as any,
    });

    const response = await action({ request: new Request("http://localhost") });
    expect(response.status).toBe(200);
  });
});
