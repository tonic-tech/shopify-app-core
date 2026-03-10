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
export declare function createGDPRAction(authenticate: WebhookAuth, ops: GDPROps): ({ request }: {
    request: Request;
}) => Promise<Response>;
export {};
//# sourceMappingURL=gdpr.d.ts.map