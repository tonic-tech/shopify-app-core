import type { PrismaClient } from "@prisma/client";
import type { TonicLinkClient } from "../tonic-link.server.js";
import type { TonicAppName } from "../tonic-link.types.js";
import { logger } from "../logger.server.js";

interface WebhookAuth {
  webhook: (request: Request) => Promise<{
    topic: string;
    shop: string;
  }>;
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
 * Create an app uninstall webhook handler
 *
 * @param onBeforeDelete - Optional hook for app-specific cleanup (e.g., GTM removal)
 *
 * @example
 * ```ts
 * // app/routes/webhooks.app.uninstalled.tsx
 * import { authenticate } from "~/shopify.server";
 * import prisma from "~/db.server";
 * import { createUninstallAction } from "@tonic/shopify-app-core/handlers";
 *
 * export const action = createUninstallAction(authenticate, prisma);
 *
 * // With app-specific cleanup:
 * export const action = createUninstallAction(authenticate, prisma, {
 *   onBeforeDelete: async (shop) => {
 *     await removeGTMFromThemes(shop);
 *   },
 * });
 * ```
 */
export function createUninstallAction(
  authenticate: WebhookAuth,
  prisma: PrismaClient,
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

    // App-specific cleanup before deletion
    if (options?.onBeforeDelete) {
      try {
        await options.onBeforeDelete(shop);
      } catch (error) {
        logger.error("Pre-delete cleanup failed", error, { shopDomain: shop });
      }
    }

    try {
      await prisma.shop.delete({ where: { shopDomain: shop } });
      logger.info("Deleted shop record", { shopDomain: shop });
    } catch (error: unknown) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
        logger.info("Shop not found (idempotent webhook)", { shopDomain: shop });
      } else {
        logger.error("Database error deleting shop", error, { shopDomain: shop });
        return new Response("Database error", { status: 500 });
      }
    }

    try {
      const result = await prisma.session.deleteMany({ where: { shop } });
      logger.info("Deleted sessions", { shopDomain: shop, count: result.count });
    } catch (error) {
      logger.error("Failed to delete sessions", error, { shopDomain: shop });
    }

    logger.webhook(topic, shop, "processed");

    return new Response(null, { status: 200 });
  };
}
