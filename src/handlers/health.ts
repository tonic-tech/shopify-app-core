import { json } from "@remix-run/node";
import type { PrismaClient } from "@prisma/client";

/**
 * Create a health check loader with DB connectivity check
 *
 * @example
 * ```ts
 * // app/routes/health.tsx
 * import prisma from "~/db.server";
 * import { createHealthLoader } from "@tonic/shopify-app-core/handlers";
 *
 * export const loader = createHealthLoader(prisma);
 * ```
 */
export function createHealthLoader(prisma: PrismaClient) {
  return async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;

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
