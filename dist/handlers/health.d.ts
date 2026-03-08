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
export declare function createHealthLoader(prisma: PrismaClient): () => Promise<import("@remix-run/server-runtime").TypedResponse<{
    status: string;
    timestamp: string;
    database: string;
}>>;
//# sourceMappingURL=health.d.ts.map