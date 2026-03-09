import type { TonicLinkClient } from "../tonic-link.server.js";
import type { TonicAppName } from "../tonic-link.types.js";
interface WebhookAuth {
    webhook: (request: Request) => Promise<{
        topic: string;
        payload: unknown;
        shop: string;
    }>;
}
interface UnauthAdmin {
    admin: (shop: string) => Promise<{
        admin: {
            graphql: (query: string, options?: {
                variables?: Record<string, unknown>;
            }) => Promise<Response>;
        };
    }>;
}
/**
 * Database operations required by the subscription handler.
 * Implement these with your ORM of choice.
 */
export interface SubscriptionOps {
    /** Upsert shop plan. Create the shop if it doesn't exist, update if it does. */
    upsertShopPlan: (shopDomain: string, data: {
        plan: string;
        subscriptionId: string;
        subscriptionStatus: string;
    }) => Promise<void>;
}
/**
 * Create a subscription webhook handler.
 *
 * @example
 * ```ts
 * // Drizzle
 * import { db, shops } from "~/db";
 * import { eq } from "drizzle-orm";
 *
 * export const action = createSubscriptionAction(authenticate, unauthenticated, {
 *   upsertShopPlan: async (shop, data) => {
 *     await db.insert(shops).values({ shopDomain: shop, ...data })
 *       .onConflictDoUpdate({ target: shops.shopDomain, set: data });
 *   },
 * }, { planNames: ["PRO"], namespace: "tracktonic" });
 *
 * // Prisma
 * export const action = createSubscriptionAction(authenticate, unauthenticated, {
 *   upsertShopPlan: async (shop, data) => {
 *     await prisma.shop.upsert({
 *       where: { shopDomain: shop },
 *       update: data,
 *       create: { shopDomain: shop, ...data },
 *     });
 *   },
 * }, { planNames: ["BUILD", "OPTIMIZE", "ENTERPRISE"], namespace: "blocktonic" });
 * ```
 */
export declare function createSubscriptionAction<T extends string>(authenticate: WebhookAuth, unauthenticated: UnauthAdmin, ops: SubscriptionOps, options: {
    planNames: readonly T[];
    namespace: string;
    appName?: TonicAppName;
    tonicLink?: TonicLinkClient;
}): ({ request }: {
    request: Request;
}) => Promise<Response>;
export {};
//# sourceMappingURL=subscription.d.ts.map