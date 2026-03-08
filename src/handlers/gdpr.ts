import type { PrismaClient } from "@prisma/client";
import { validateGDPRPayload } from "../validation.server.js";

interface WebhookAuth {
  webhook: (request: Request) => Promise<{
    topic: string;
    payload: unknown;
    shop: string;
  }>;
}

/**
 * Create a GDPR webhook action handler
 *
 * Handles: CUSTOMERS_DATA_REQUEST, CUSTOMERS_REDACT, SHOP_REDACT
 * Always returns 200 to Shopify (idempotent)
 *
 * @example
 * ```ts
 * // app/routes/webhooks.gdpr.tsx
 * import { authenticate } from "~/shopify.server";
 * import prisma from "~/db.server";
 * import { createGDPRAction } from "@tonic/shopify-app-core/handlers";
 *
 * export const action = createGDPRAction(authenticate, prisma);
 * ```
 */
export function createGDPRAction(
  authenticate: WebhookAuth,
  prisma: PrismaClient
) {
  return async ({ request }: { request: Request }) => {
    const { topic, payload, shop } = await authenticate.webhook(request);

    console.log(`Received GDPR webhook: ${topic} for ${shop}`);

    const gdprPayload = validateGDPRPayload(payload);
    if (!gdprPayload) {
      console.error(`Invalid GDPR payload for ${topic} from ${shop}`);
      return new Response(null, { status: 200 });
    }

    switch (topic) {
      case "CUSTOMERS_DATA_REQUEST":
        console.log(
          `Data request received for customer ${gdprPayload.customer?.email} from ${shop}`
        );
        break;

      case "CUSTOMERS_REDACT":
        console.log(
          `Redact request for customer ${gdprPayload.customer?.email} from ${shop}`
        );
        break;

      case "SHOP_REDACT":
        console.log(`Shop redact request for ${shop}`);
        try {
          await prisma.shop.delete({ where: { shopDomain: shop } });
          await prisma.session.deleteMany({ where: { shop } });
          console.log(`Successfully deleted all data for ${shop}`);
        } catch (error) {
          console.log(`Shop ${shop} data may already be deleted:`, error);
        }
        break;

      default:
        console.log(`Unhandled GDPR topic: ${topic}`);
    }

    return new Response(null, { status: 200 });
  };
}
