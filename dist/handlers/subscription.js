import { validateSubscriptionPayload, createPlanValidator } from "../validation.server.js";
import { syncPlanMetafield } from "../metafields.server.js";
import { logger } from "../logger.server.js";
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
export function createSubscriptionAction(authenticate, unauthenticated, ops, options) {
    const { validatePlan } = createPlanValidator(options.planNames);
    return async ({ request }) => {
        const { shop, payload, topic } = await authenticate.webhook(request);
        logger.webhook(topic, shop, "received");
        const validatedPayload = validateSubscriptionPayload(payload);
        if (!validatedPayload?.app_subscription) {
            logger.error("Invalid webhook payload", undefined, {
                topic,
                shopDomain: shop,
                receivedKeys: payload ? Object.keys(payload) : "null",
            });
            return new Response("Invalid payload: missing app_subscription", { status: 400 });
        }
        const { name, status, admin_graphql_api_id } = validatedPayload.app_subscription;
        const plan = (status === "ACTIVE" || status === "FROZEN" || status === "PENDING")
            ? validatePlan(name)
            : "FREE";
        try {
            await ops.upsertShopPlan(shop, {
                plan,
                subscriptionId: admin_graphql_api_id,
                subscriptionStatus: status,
            });
            logger.billing("subscription_updated", shop, plan, { status });
        }
        catch (error) {
            logger.error("Failed to update subscription", error, { shopDomain: shop });
            return new Response("Database error", { status: 500 });
        }
        // Sync plan to Shopify metafields (best-effort)
        try {
            const { admin } = await unauthenticated.admin(shop);
            await syncPlanMetafield(admin, options.namespace, plan);
            logger.info("Synced plan metafield", { shopDomain: shop, plan });
        }
        catch (error) {
            logger.error("Failed to sync metafield", error, { shopDomain: shop });
        }
        // Report plan change to Tonic (best-effort, non-blocking)
        if (options.tonicLink?.configured && options.appName) {
            try {
                await options.tonicLink.reportPlanChange(shop, options.appName, plan, status);
                logger.info("Reported plan change to Tonic", { shopDomain: shop, appName: options.appName, plan });
            }
            catch (error) {
                logger.error("Failed to report plan change to Tonic", error, { shopDomain: shop, appName: options.appName });
            }
        }
        logger.webhook(topic, shop, "processed", { plan });
        return new Response(null, { status: 200 });
    };
}
//# sourceMappingURL=subscription.js.map