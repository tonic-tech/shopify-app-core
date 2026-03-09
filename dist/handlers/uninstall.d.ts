import type { PrismaClient } from "@prisma/client";
import type { TonicLinkClient } from "../tonic-link.server.js";
import type { TonicAppName } from "../tonic-link.types.js";
interface WebhookAuth {
    webhook: (request: Request) => Promise<{
        topic: string;
        shop: string;
    }>;
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
export declare function createUninstallAction(authenticate: WebhookAuth, prisma: PrismaClient, options?: {
    onBeforeDelete?: (shop: string) => Promise<void>;
    appName?: TonicAppName;
    tonicLink?: TonicLinkClient;
}): ({ request }: {
    request: Request;
}) => Promise<Response>;
export {};
//# sourceMappingURL=uninstall.d.ts.map