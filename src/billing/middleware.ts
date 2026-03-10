import { redirect } from "@remix-run/node";
import { logger } from "../logger.server.js";
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
export async function requirePlan<T extends string>(
  shopDomain: string,
  options: RequirePlanOptions<T>
): Promise<PlanCheckResult> {
  const { billingConfig, upgradeUrl } = options;

  const currentPlan = await options.getShopPlan(shopDomain);
  const resolvedPlan = billingConfig.getPlan(currentPlan);

  // Check plan name requirement
  let hasRequiredPlan = true;
  if (options.plans && options.plans.length > 0) {
    const upperPlans = options.plans.map(p => p.toUpperCase());
    hasRequiredPlan = upperPlans.includes(currentPlan.toUpperCase());
  }

  // Check feature requirements
  let hasRequiredFeatures = true;
  if (options.features && options.features.length > 0) {
    hasRequiredFeatures = options.features.every(
      feature => billingConfig.hasFeature(currentPlan, feature)
    );
  }

  const authorized = hasRequiredPlan && hasRequiredFeatures;

  logger.billing("plan_check", shopDomain, currentPlan, {
    authorized,
    requiredPlans: options.plans,
    requiredFeatures: options.features,
  });

  if (!authorized) {
    throw redirect(upgradeUrl);
  }

  return { currentPlan, resolvedPlan, authorized };
}
