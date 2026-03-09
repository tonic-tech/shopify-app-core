import type { TonicLinkClient } from "../tonic-link.server.js";
import type { TonicAppName } from "../tonic-link.types.js";
interface WebhookAuth {
    webhook: (request: Request) => Promise<{
        topic: string;
        shop: string;
    }>;
}
/**
 * Database operations required by the uninstall handler.
 * Implement these with your ORM of choice (Drizzle, Prisma, raw SQL).
 */
export interface UninstallOps {
    /** Delete the shop record by domain. Should not throw if shop doesn't exist. */
    deleteShop: (shopDomain: string) => Promise<void>;
    /** Delete all sessions for a shop domain. */
    deleteSessions: (shop: string) => Promise<void>;
}
/**
 * Create an app uninstall webhook handler.
 *
 * @example
 * ```ts
 * // Drizzle
 * import { db, shops, sessions } from "~/db";
 * import { eq } from "drizzle-orm";
 * import { createUninstallAction } from "@tonic/shopify-app-core/handlers";
 *
 * export const action = createUninstallAction(authenticate, {
 *   deleteShop: (shop) => db.delete(shops).where(eq(shops.shopDomain, shop)).then(() => {}),
 *   deleteSessions: (shop) => db.delete(sessions).where(eq(sessions.shop, shop)).then(() => {}),
 * }, { appName: "tracktonic", tonicLink });
 *
 * // Prisma
 * import prisma from "~/db.server";
 * export const action = createUninstallAction(authenticate, {
 *   deleteShop: (shop) => prisma.shop.delete({ where: { shopDomain: shop } }).catch(() => {}),
 *   deleteSessions: (shop) => prisma.session.deleteMany({ where: { shop } }).then(() => {}),
 * }, { appName: "blocktonic", tonicLink });
 * ```
 */
export declare function createUninstallAction(authenticate: WebhookAuth, ops: UninstallOps, options?: {
    onBeforeDelete?: (shop: string) => Promise<void>;
    appName?: TonicAppName;
    tonicLink?: TonicLinkClient;
}): ({ request }: {
    request: Request;
}) => Promise<Response>;
export {};
//# sourceMappingURL=uninstall.d.ts.map