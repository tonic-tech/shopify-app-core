import type { TonicLinkClient } from "../tonic-link.server.js";
import type { TonicAppName } from "../tonic-link.types.js";
import { logger } from "../logger.server.js";

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
  /** Optional: clean up billing state before shop deletion (APP_SUBSCRIPTIONS_UPDATE doesn't fire on uninstall). */
  onBillingCleanup?: (shopDomain: string) => Promise<void>;
}

function isValidShopDomain(shop: string): boolean {
  return (
    typeof shop === "string" &&
    shop.length > 0 &&
    shop.length <= 255 &&
    /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop)
  );
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
export function createUninstallAction(
  authenticate: WebhookAuth,
  ops: UninstallOps,
  options?: {
    onBeforeDelete?: (shop: string) => Promise<void>;
    appName?: TonicAppName;
    tonicLink?: TonicLinkClient;
  }
) {
  return async ({ request }: { request: Request }) => {
    const { shop, topic } = await authenticate.webhook(request);

    if (!isValidShopDomain(shop)) {
      logger.error("Invalid shop domain format in webhook", undefined, { shop });
      return new Response("Invalid shop domain", { status: 400 });
    }

    logger.webhook(topic, shop, "received");

    // Report uninstall to Tonic (best-effort, non-blocking)
    if (options?.tonicLink?.configured && options?.appName) {
      try {
        await options.tonicLink.reportUninstall(shop, options.appName);
        logger.info("Reported uninstall to Tonic", { shopDomain: shop, appName: options.appName });
      } catch (error) {
        logger.error("Failed to report uninstall to Tonic", error, { shopDomain: shop, appName: options.appName });
      }
    }

    // Report FREE plan to Tonic (since APP_SUBSCRIPTIONS_UPDATE doesn't fire on uninstall)
    if (options?.tonicLink?.configured && options?.appName) {
      try {
        await options.tonicLink.reportPlanChange(shop, options.appName, "FREE", "CANCELLED");
      } catch (error) {
        logger.error("Failed to report FREE plan on uninstall", error, { shopDomain: shop });
      }
    }

    // Billing cleanup (best-effort, before shop deletion)
    if (ops.onBillingCleanup) {
      try {
        await ops.onBillingCleanup(shop);
        logger.billing("uninstall_billing_cleanup", shop, "FREE");
      } catch (error) {
        logger.error("Billing cleanup failed", error, { shopDomain: shop });
      }
    }

    // App-specific cleanup before deletion
    if (options?.onBeforeDelete) {
      try {
        await options.onBeforeDelete(shop);
      } catch (error) {
        logger.error("Pre-delete cleanup failed", error, { shopDomain: shop });
      }
    }

    // Delete shop record
    try {
      await ops.deleteShop(shop);
      logger.info("Deleted shop record", { shopDomain: shop });
    } catch (error) {
      logger.error("Database error deleting shop", error, { shopDomain: shop });
      return new Response("Database error", { status: 500 });
    }

    // Delete sessions
    try {
      await ops.deleteSessions(shop);
      logger.info("Deleted sessions", { shopDomain: shop });
    } catch (error) {
      logger.error("Failed to delete sessions", error, { shopDomain: shop });
    }

    logger.webhook(topic, shop, "processed");

    return new Response(null, { status: 200 });
  };
}
