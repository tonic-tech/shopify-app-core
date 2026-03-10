import type { RequirePlanOptions, PlanCheckResult } from "./types.js";
/**
 * Enforce plan requirements in a Remix loader or action.
 *
 * Call this after `authenticate.admin(request)` to gate access by plan or features.
 * Returns plan info if authorized, throws a redirect if not.
 *
 * @example
 * ```ts
 * export const loader = async ({ request }) => {
 *   const { session } = await authenticate.admin(request);
 *   const { currentPlan, resolvedPlan } = await requirePlan(session.shop, {
 *     features: ["analytics"],
 *     getShopPlan: async (shop) => {
 *       const row = await db.query.shops.findFirst({ where: eq(shops.shopDomain, shop) });
 *       return row?.plan ?? "FREE";
 *     },
 *     billingConfig,
 *     upgradeUrl: "/app/billing",
 *   });
 *   return json({ plan: currentPlan, features: resolvedPlan.features });
 * };
 * ```
 *
 * @throws {Response} Redirect to upgradeUrl if plan requirements are not met
 */
export declare function requirePlan<T extends string>(shopDomain: string, options: RequirePlanOptions<T>): Promise<PlanCheckResult>;
//# sourceMappingURL=middleware.d.ts.map