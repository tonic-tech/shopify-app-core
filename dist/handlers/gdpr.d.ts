import type { PrismaClient } from "@prisma/client";
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
export declare function createGDPRAction(authenticate: WebhookAuth, prisma: PrismaClient): ({ request }: {
    request: Request;
}) => Promise<Response>;
export {};
//# sourceMappingURL=gdpr.d.ts.map