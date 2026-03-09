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
export declare function createHealthLoader(ops: HealthOps): () => Promise<import("@remix-run/server-runtime").TypedResponse<{
    status: string;
    timestamp: string;
    database: string;
}>>;
//# sourceMappingURL=health.d.ts.map