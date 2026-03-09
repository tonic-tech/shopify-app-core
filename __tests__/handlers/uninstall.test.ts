import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/sentry.server.js", () => ({
  captureException: vi.fn().mockResolvedValue(null),
  initSentry: vi.fn().mockResolvedValue(false),
}));

import { createUninstallAction } from "../../src/handlers/uninstall.js";

function createMockAuthenticate(shop?: string) {
  return {
    webhook: vi.fn().mockResolvedValue({
      topic: "APP_UNINSTALLED",
      shop: shop ?? "test-store.myshopify.com",
    }),
  };
}

function createMockOps() {
  return {
    deleteShop: vi.fn().mockResolvedValue(undefined),
    deleteSessions: vi.fn().mockResolvedValue(undefined),
  };
}

describe("createUninstallAction", () => {
  let mockAuth: ReturnType<typeof createMockAuthenticate>;
  let mockOps: ReturnType<typeof createMockOps>;

  beforeEach(() => {
    mockAuth = createMockAuthenticate();
    mockOps = createMockOps();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns 200 on successful uninstall", async () => {
    const action = createUninstallAction(mockAuth, mockOps);
    const response = await action({ request: new Request("http://localhost") });

    expect(response.status).toBe(200);
    expect(mockOps.deleteShop).toHaveBeenCalledWith("test-store.myshopify.com");
    expect(mockOps.deleteSessions).toHaveBeenCalledWith("test-store.myshopify.com");
  });

  it("calls deleteShop before deleteSessions", async () => {
    const callOrder: string[] = [];
    mockOps.deleteShop.mockImplementation(async () => { callOrder.push("deleteShop"); });
    mockOps.deleteSessions.mockImplementation(async () => { callOrder.push("deleteSessions"); });

    const action = createUninstallAction(mockAuth, mockOps);
    await action({ request: new Request("http://localhost") });

    expect(callOrder).toEqual(["deleteShop", "deleteSessions"]);
  });

  // ─── Domain validation ──────────────────────────────────────────────────

  it("returns 400 for an invalid shop domain (no .myshopify.com)", async () => {
    mockAuth = createMockAuthenticate("evil-domain.com");
    const action = createUninstallAction(mockAuth, mockOps);
    const response = await action({ request: new Request("http://localhost") });

    expect(response.status).toBe(400);
    expect(mockOps.deleteShop).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty shop domain", async () => {
    mockAuth = createMockAuthenticate("");
    const action = createUninstallAction(mockAuth, mockOps);
    const response = await action({ request: new Request("http://localhost") });

    expect(response.status).toBe(400);
  });

  it("returns 400 for a shop domain that starts with a hyphen", async () => {
    mockAuth = createMockAuthenticate("-bad-start.myshopify.com");
    const action = createUninstallAction(mockAuth, mockOps);
    const response = await action({ request: new Request("http://localhost") });

    expect(response.status).toBe(400);
  });

  it("accepts a valid subdomain with hyphens", async () => {
    mockAuth = createMockAuthenticate("my-cool-store.myshopify.com");
    const action = createUninstallAction(mockAuth, mockOps);
    const response = await action({ request: new Request("http://localhost") });

    expect(response.status).toBe(200);
  });

  it("returns 400 for a domain with special characters", async () => {
    mockAuth = createMockAuthenticate("store<script>.myshopify.com");
    const action = createUninstallAction(mockAuth, mockOps);
    const response = await action({ request: new Request("http://localhost") });

    expect(response.status).toBe(400);
  });

  it("returns 400 for a very long domain (> 255 chars)", async () => {
    const longDomain = "a".repeat(250) + ".myshopify.com";
    mockAuth = createMockAuthenticate(longDomain);
    const action = createUninstallAction(mockAuth, mockOps);
    const response = await action({ request: new Request("http://localhost") });

    expect(response.status).toBe(400);
  });

  // ─── Error handling ─────────────────────────────────────────────────────

  it("returns 500 when deleteShop throws a database error", async () => {
    mockOps.deleteShop.mockRejectedValue(new Error("DB error"));

    const action = createUninstallAction(mockAuth, mockOps);
    const response = await action({ request: new Request("http://localhost") });

    expect(response.status).toBe(500);
  });

  it("returns 200 even when deleteSessions throws (non-critical)", async () => {
    mockOps.deleteSessions.mockRejectedValue(new Error("Session cleanup error"));

    const action = createUninstallAction(mockAuth, mockOps);
    const response = await action({ request: new Request("http://localhost") });

    expect(response.status).toBe(200);
  });

  // ─── onBeforeDelete hook ────────────────────────────────────────────────

  it("calls onBeforeDelete before deleting shop", async () => {
    const callOrder: string[] = [];
    const onBeforeDelete = vi.fn().mockImplementation(async () => { callOrder.push("onBeforeDelete"); });
    mockOps.deleteShop.mockImplementation(async () => { callOrder.push("deleteShop"); });

    const action = createUninstallAction(mockAuth, mockOps, { onBeforeDelete });
    await action({ request: new Request("http://localhost") });

    expect(onBeforeDelete).toHaveBeenCalledWith("test-store.myshopify.com");
    expect(callOrder).toEqual(["onBeforeDelete", "deleteShop"]);
  });

  it("continues with deletion even if onBeforeDelete throws", async () => {
    const onBeforeDelete = vi.fn().mockRejectedValue(new Error("Cleanup failed"));

    const action = createUninstallAction(mockAuth, mockOps, { onBeforeDelete });
    const response = await action({ request: new Request("http://localhost") });

    expect(response.status).toBe(200);
    expect(mockOps.deleteShop).toHaveBeenCalled();
  });

  // ─── TonicLink integration ──────────────────────────────────────────────

  it("reports uninstall to TonicLink when configured", async () => {
    const mockTonicLink = {
      configured: true,
      reportUninstall: vi.fn().mockResolvedValue({ status: "updated", apps: {} }),
    };

    const action = createUninstallAction(mockAuth, mockOps, {
      appName: "tracktonic",
      tonicLink: mockTonicLink as any,
    });

    await action({ request: new Request("http://localhost") });

    expect(mockTonicLink.reportUninstall).toHaveBeenCalledWith(
      "test-store.myshopify.com",
      "tracktonic"
    );
  });

  it("does not report to TonicLink when not configured", async () => {
    const mockTonicLink = {
      configured: false,
      reportUninstall: vi.fn(),
    };

    const action = createUninstallAction(mockAuth, mockOps, {
      appName: "blocktonic",
      tonicLink: mockTonicLink as any,
    });

    await action({ request: new Request("http://localhost") });

    expect(mockTonicLink.reportUninstall).not.toHaveBeenCalled();
  });

  it("continues with deletion even if TonicLink report fails", async () => {
    const mockTonicLink = {
      configured: true,
      reportUninstall: vi.fn().mockRejectedValue(new Error("Network error")),
    };

    const action = createUninstallAction(mockAuth, mockOps, {
      appName: "flowtonic",
      tonicLink: mockTonicLink as any,
    });

    const response = await action({ request: new Request("http://localhost") });

    expect(response.status).toBe(200);
    expect(mockOps.deleteShop).toHaveBeenCalled();
  });
});
