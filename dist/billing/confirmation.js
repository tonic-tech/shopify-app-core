import { redirect } from "@remix-run/node";
import { syncPlanMetafield } from "../metafields.server.js";
import { logger } from "../logger.server.js";
/**
 * Create a loader for the charge confirmation return URL route.
 *
 * After a merchant approves or declines a charge on Shopify's confirmation page,
 * they are redirected back to your app. This handler processes that return,
 * updates the local plan record, and syncs metafields.
 *
 * @example
 * ```ts
 * // routes/app.billing.confirm.tsx
 * export const loader = createChargeConfirmationLoader(authenticate, {
 *   onChargeConfirmed: async (shop, plan, subscriptionId) => {
 *     await db.update(shops).set({ plan, subscriptionId }).where(eq(shops.shopDomain, shop));
 *   },
 *   onChargeDeclined: async (shop) => {
 *     // Optional: track declined charges for analytics
 *   },
 * }, { namespace: "blocktonic" });
 * ```
 */
export function createChargeConfirmationLoader(authenticate, ops, options) {
    const successUrl = options.successRedirectUrl ?? "/app";
    const declinedUrl = options.declinedRedirectUrl ?? "/app/billing";
    return async ({ request }) => {
        const { session, admin, billing } = await authenticate.admin(request);
        const shop = session.shop;
        logger.billing("charge_confirmation", shop, "checking");
        let billingStatus;
        try {
            billingStatus = await billing.check();
        }
        catch (error) {
            logger.error("Failed to check billing status", error, { shopDomain: shop });
            throw redirect(declinedUrl);
        }
        if (billingStatus.hasActivePayment && billingStatus.appSubscriptions.length > 0) {
            const subscription = billingStatus.appSubscriptions[0];
            const plan = subscription.name;
            const subscriptionId = subscription.id;
            try {
                await ops.onChargeConfirmed(shop, plan, subscriptionId);
                logger.billing("charge_confirmed", shop, plan, { subscriptionId });
            }
            catch (error) {
                logger.error("Failed to process charge confirmation", error, { shopDomain: shop });
            }
            // Sync metafield (best-effort)
            try {
                await syncPlanMetafield(admin, options.namespace, plan);
            }
            catch (error) {
                logger.error("Failed to sync metafield after confirmation", error, { shopDomain: shop });
            }
            // Report to Tonic (best-effort)
            if (options.tonicLink?.configured && options.appName) {
                try {
                    await options.tonicLink.reportPlanChange(shop, options.appName, plan, subscription.status);
                }
                catch (error) {
                    logger.error("Failed to report plan change to Tonic", error, { shopDomain: shop });
                }
            }
            throw redirect(successUrl);
        }
        // No active payment — charge was declined or expired
        try {
            await ops.onChargeDeclined(shop);
            logger.billing("charge_declined", shop, "FREE");
        }
        catch (error) {
            logger.error("Failed to process charge decline", error, { shopDomain: shop });
        }
        throw redirect(declinedUrl);
    };
}
//# sourceMappingURL=confirmation.js.map