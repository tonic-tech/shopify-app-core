import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHealthLoader } from "../../src/handlers/health.js";

describe("createHealthLoader", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns 200 with healthy status when ping succeeds", async () => {
    const ops = { ping: vi.fn().mockResolvedValue(undefined) };
    const loader = createHealthLoader(ops);
    const response = await loader();

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.database).toBe("connected");
    expect(body.timestamp).toBeDefined();
  });

  it("returns a valid ISO timestamp", async () => {
    const ops = { ping: vi.fn().mockResolvedValue(undefined) };
    const loader = createHealthLoader(ops);
    const response = await loader();

    const body = await response.json();
    const parsed = new Date(body.timestamp);
    expect(parsed.toISOString()).toBe(body.timestamp);
  });

  it("returns 503 with unhealthy status when ping throws", async () => {
    const ops = { ping: vi.fn().mockRejectedValue(new Error("Connection refused")) };
    const loader = createHealthLoader(ops);
    const response = await loader();

    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.status).toBe("unhealthy");
    expect(body.database).toBe("disconnected");
  });

  it("logs the error message when ping throws an Error instance", async () => {
    const ops = { ping: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) };
    const loader = createHealthLoader(ops);
    await loader();

    expect(console.error).toHaveBeenCalledWith(
      "Health check failed:",
      "ECONNREFUSED"
    );
  });

  it("logs 'Unknown error' when ping throws a non-Error value", async () => {
    const ops = { ping: vi.fn().mockRejectedValue("string error") };
    const loader = createHealthLoader(ops);
    await loader();

    expect(console.error).toHaveBeenCalledWith(
      "Health check failed:",
      "Unknown error"
    );
  });

  it("calls ping exactly once per invocation", async () => {
    const ops = { ping: vi.fn().mockResolvedValue(undefined) };
    const loader = createHealthLoader(ops);

    await loader();
    await loader();

    expect(ops.ping).toHaveBeenCalledTimes(2);
  });
});
