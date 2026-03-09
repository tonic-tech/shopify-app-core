import { json } from "@remix-run/node";

/**
 * Database operations required by the health check handler.
 */
export interface HealthOps {
  /** Ping the database (e.g., `db.execute(sql\`SELECT 1\`)` or `prisma.$queryRaw\`SELECT 1\``) */
  ping: () => Promise<void>;
}

/**
 * Create a health check loader with DB connectivity check.
 *
 * @example
 * ```ts
 * // Drizzle
 * import { db } from "~/db";
 * import { sql } from "drizzle-orm";
 * import { createHealthLoader } from "@tonic/shopify-app-core/handlers";
 * export const loader = createHealthLoader({ ping: () => db.execute(sql`SELECT 1`).then(() => {}) });
 *
 * // Prisma
 * import prisma from "~/db.server";
 * export const loader = createHealthLoader({ ping: () => prisma.$queryRaw`SELECT 1`.then(() => {}) });
 * ```
 */
export function createHealthLoader(ops: HealthOps) {
  return async () => {
    try {
      await ops.ping();

      return json(
        {
          status: "healthy",
          timestamp: new Date().toISOString(),
          database: "connected",
        },
        { status: 200 }
      );
    } catch (error) {
      console.error(
        "Health check failed:",
        error instanceof Error ? error.message : "Unknown error"
      );

      return json(
        {
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          database: "disconnected",
        },
        { status: 503 }
      );
    }
  };
}
