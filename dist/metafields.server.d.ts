/**
 * Shopify Metafield Sync
 * Syncs app plan to Shop-level metafields for theme access via Liquid
 */
type AdminGraphQL = {
    graphql: (query: string, options?: {
        variables?: Record<string, unknown>;
    }) => Promise<Response>;
};
/**
 * Sync app plan to Shopify metafields
 *
 * @param admin - Shopify Admin API client
 * @param namespace - App namespace (e.g., "blocktonic", "flowtonic")
 * @param plan - Current plan name
 */
export declare function syncPlanMetafield(admin: AdminGraphQL, namespace: string, plan: string): Promise<any>;
/**
 * Clear plan metafield on uninstall (sets plan to FREE)
 */
export declare function clearPlanMetafield(admin: AdminGraphQL, namespace: string): Promise<any>;
/**
 * Register metafield definitions for theme access
 * Call once on app install
 */
export declare function createMetafieldDefinitions(admin: AdminGraphQL, namespace: string, appName: string): Promise<void>;
export {};
//# sourceMappingURL=metafields.server.d.ts.map