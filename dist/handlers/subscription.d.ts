import type { PrismaClient } from "@prisma/client";
import type { TonicLinkClient } from "../tonic-link.server.js";
import type { TonicAppName } from "../tonic-link.types.js";
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
            graphql: (query: string, options?: {
                variables?: Record<string, unknown>;
            }) => Promise<Response>;
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
export declare function createSubscriptionAction<T extends string>(authenticate: WebhookAuth, unauthenticated: UnauthAdmin, prisma: PrismaClient, options: {
    planNames: readonly T[];
    namespace: string;
    appName?: TonicAppName;
    tonicLink?: TonicLinkClient;
}): ({ request }: {
    request: Request;
}) => Promise<Response>;
export {};
//# sourceMappingURL=subscription.d.ts.map