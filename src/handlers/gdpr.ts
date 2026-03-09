import { validateGDPRPayload } from "../validation.server.js";
import { logger } from "../logger.server.js";

interface WebhookAuth {
  webhook: (request: Request) => Promise<{
    topic: string;
    payload: unknown;
    shop: string;
  }>;
}

/**
 * Database operations required by the GDPR handler.
 * Implement these with your ORM of choice.
 */
export interface GDPROps {
  /** Delete all shop data by domain. Should not throw if shop doesn't exist. */
  deleteShop: (shopDomain: string) => Promise<void>;
  /** Delete all sessions for a shop domain. */
  deleteSessions: (shop: string) => Promise<void>;
  /** Delete or anonymize all PII for a specific customer. Optional per-app. */
  deleteCustomerData?: (shopDomain: string, customerId: string, customerEmail: string) => Promise<void>;
  /** Return all stored data for a specific customer. Optional per-app. */
  getCustomerData?: (shopDomain: string, customerId: string, customerEmail: string) => Promise<unknown[]>;
}

/**
 * Create a GDPR webhook action handler.
 *
 * Handles: CUSTOMERS_DATA_REQUEST, CUSTOMERS_REDACT, SHOP_REDACT
 * Always returns 200 to Shopify (idempotent).
 *
 * @example
 * ```ts
 * // Drizzle
 * export const action = createGDPRAction(authenticate, {
 *   deleteShop: (shop) => db.delete(shops).where(eq(shops.shopDomain, shop)).then(() => {}),
 *   deleteSessions: (shop) => db.delete(sessions).where(eq(sessions.shop, shop)).then(() => {}),
 * });
 *
 * // Prisma
 * export const action = createGDPRAction(authenticate, {
 *   deleteShop: (shop) => prisma.shop.delete({ where: { shopDomain: shop } }).catch(() => {}),
 *   deleteSessions: (shop) => prisma.session.deleteMany({ where: { shop } }).then(() => {}),
 * });
 * ```
 */
export function createGDPRAction(
  authenticate: WebhookAuth,
  ops: GDPROps
) {
  return async ({ request }: { request: Request }) => {
    const { topic, payload, shop } = await authenticate.webhook(request);

    logger.webhook(topic, shop, "received");

    const gdprPayload = validateGDPRPayload(payload);
    if (!gdprPayload) {
      logger.error("Invalid GDPR payload", undefined, { topic, shopDomain: shop });
      return new Response(null, { status: 200 });
    }

    switch (topic) {
      case "CUSTOMERS_DATA_REQUEST":
        logger.info("Customer data request", {
          shopDomain: shop,
          customerEmail: gdprPayload.customer?.email,
        });
        if (ops.getCustomerData && gdprPayload.customer) {
          try {
            const data = await ops.getCustomerData(
              shop,
              String(gdprPayload.customer.id),
              gdprPayload.customer.email,
            );
            logger.info("Customer data retrieved", {
              shopDomain: shop,
              recordCount: data.length,
            });
          } catch (error) {
            logger.error("Failed to retrieve customer data", error, { shopDomain: shop });
          }
        }
        break;

      case "CUSTOMERS_REDACT":
        logger.info("Customer redact request", {
          shopDomain: shop,
          customerEmail: gdprPayload.customer?.email,
        });
        if (ops.deleteCustomerData && gdprPayload.customer) {
          try {
            await ops.deleteCustomerData(
              shop,
              String(gdprPayload.customer.id),
              gdprPayload.customer.email,
            );
            logger.info("Customer data deleted", { shopDomain: shop });
          } catch (error) {
            logger.error("Failed to delete customer data", error, { shopDomain: shop });
          }
        }
        break;

      case "SHOP_REDACT":
        logger.info("Shop redact request", { shopDomain: shop });
        try {
          await ops.deleteShop(shop);
          await ops.deleteSessions(shop);
          logger.info("Redacted all data", { shopDomain: shop });
        } catch (error) {
          logger.error("Failed to redact shop data", error, { shopDomain: shop });
        }
        break;

      default:
        logger.info("Unhandled GDPR topic", { topic, shopDomain: shop });
    }

    return new Response(null, { status: 200 });
  };
}
