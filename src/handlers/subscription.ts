import type { PrismaClient } from "@prisma/client";
import type { TonicLinkClient } from "../tonic-link.server.js";
import type { TonicAppName } from "../tonic-link.types.js";
import { validateSubscriptionPayload, createPlanValidator } from "../validation.server.js";
import { syncPlanMetafield } from "../metafields.server.js";
import { logger } from "../logger.server.js";

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
      graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
    };
  }>;
}

/**
 * Create a subscription webhook handler
 *
 * @param planNames - Valid paid plan names for this app (e.g., ["BUILD", "OPTIMIZE", "ENTERPRISE"])
 * @param namespace - Metafield namespace for plan sync (e.g., "blocktonic")
 *
 * @example
 * ```ts
 * // app/routes/webhooks.subscription.tsx
 * import { authenticate, unauthenticated } from "~/shopify.server";
 * import prisma from "~/db.server";
 * import { createSubscriptionAction } from "@tonic/shopify-app-core/handlers";
 *
 * export const action = createSubscriptionAction(
 *   authenticate,
 *   unauthenticated,
 *   prisma,
 *   { planNames: ["BUILD", "OPTIMIZE", "ENTERPRISE"], namespace: "blocktonic" }
 * );
 * ```
 */
export function createSubscriptionAction<T extends string>(
  authenticate: WebhookAuth,
  unauthenticated: UnauthAdmin,
  prisma: PrismaClient,
  options: {
    planNames: readonly T[];
    namespace: string;
    appName?: TonicAppName;
    tonicLink?: TonicLinkClient;
  }
) {
  const { validatePlan } = createPlanValidator(options.planNames);

  return async ({ request }: { request: Request }) => {
    const { shop, payload, topic } = await authenticate.webhook(request);

    logger.webhook(topic, shop, "received");

    const validatedPayload = validateSubscriptionPayload(payload);

    if (!validatedPayload?.app_subscription) {
      logger.error("Invalid webhook payload", undefined, {
        topic,
        shopDomain: shop,
        receivedKeys: payload ? Object.keys(payload as object) : "null",
      });
      return new Response("Invalid payload: missing app_subscription", { status: 400 });
    }

    const { name, status, admin_graphql_api_id } = validatedPayload.app_subscription;
    const plan = status === "ACTIVE" ? validatePlan(name) : "FREE";

    try {
      await prisma.shop.upsert({
        where: { shopDomain: shop },
        update: {
          plan,
          subscriptionId: admin_graphql_api_id,
          subscriptionStatus: status,
        },
        create: {
          shopDomain: shop,
          plan,
          subscriptionId: admin_graphql_api_id,
          subscriptionStatus: status,
        },
      });

      logger.billing("subscription_updated", shop, plan, { status });
    } catch (error) {
      logger.error("Failed to update subscription", error, { shopDomain: shop });
      return new Response("Database error", { status: 500 });
    }

    // Sync plan to Shopify metafields (best-effort)
    try {
      const { admin } = await unauthenticated.admin(shop);
      await syncPlanMetafield(admin, options.namespace, plan);
      logger.info("Synced plan metafield", { shopDomain: shop, plan });
    } catch (error) {
      logger.error("Failed to sync metafield", error, { shopDomain: shop });
    }

    // Report plan change to Tonic (best-effort, non-blocking)
    if (options.tonicLink?.configured && options.appName) {
      try {
        await options.tonicLink.reportPlanChange(shop, options.appName, plan, status);
        logger.info("Reported plan change to Tonic", { shopDomain: shop, appName: options.appName, plan });
      } catch (error) {
        logger.error("Failed to report plan change to Tonic", error, { shopDomain: shop, appName: options.appName });
      }
    }

    logger.webhook(topic, shop, "processed", { plan });

    return new Response(null, { status: 200 });
  };
}
