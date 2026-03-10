import type { ChargeConfirmationOps, ChargeConfirmationOptions } from "./types.js";
interface AuthenticateAdmin {
    admin: (request: Request) => Promise<{
        session: {
            shop: string;
        };
        admin: {
            graphql: (query: string, options?: {
                variables?: Record<string, unknown>;
            }) => Promise<Response>;
        };
        billing: {
            check: () => Promise<{
                hasActivePayment: boolean;
                appSubscriptions: Array<{
                    id: string;
                    name: string;
                    status: string;
                    test: boolean;
                }>;
            }>;
        };
    }>;
}
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
export declare function createChargeConfirmationLoader(authenticate: AuthenticateAdmin, ops: ChargeConfirmationOps, options: ChargeConfirmationOptions): ({ request }: {
    request: Request;
}) => Promise<never>;
export {};
//# sourceMappingURL=confirmation.d.ts.map