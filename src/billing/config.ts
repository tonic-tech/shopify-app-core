import type {
  PlanDefinition,
  PlansInput,
  ResolvedPlan,
  BillingConfig,
  BillingInterval,
  ShopifyBillingPlan,
} from "./types.js";

const FREE_PLAN: ResolvedPlan = {
  name: "FREE",
  amount: 0,
  currencyCode: "USD",
  interval: "EVERY_30_DAYS",
  trialDays: 0,
  features: [],
  isUsageBased: false,
};

function resolvePlan(name: string, def: PlanDefinition): ResolvedPlan {
  const interval: BillingInterval = def.amount === 0
    ? "EVERY_30_DAYS"
    : (def.interval ?? "EVERY_30_DAYS");

  return {
    name,
    amount: def.amount,
    currencyCode: def.currencyCode ?? "USD",
    interval,
    trialDays: def.trialDays ?? 0,
    features: def.features ?? [],
    isUsageBased: interval === "USAGE",
    cappedAmount: def.cappedAmount,
    terms: def.terms,
  };
}

/**
 * Create a type-safe billing configuration from plan definitions.
 *
 * @example
 * ```ts
 * const billing = createBillingConfig({
 *   BUILD:      { amount: 9.99,  trialDays: 7,  features: ["blocks", "forms"] },
 *   OPTIMIZE:   { amount: 29.99, trialDays: 7,  features: ["blocks", "forms", "analytics"] },
 *   ENTERPRISE: { amount: 99.99, trialDays: 14, features: ["*"] },
 * });
 *
 * // Pass to shopifyApp()
 * const shopify = shopifyApp({ billing: billing.toShopifyBilling() });
 *
 * // Check features
 * billing.hasFeature("OPTIMIZE", "analytics"); // true
 * billing.hasFeature("BUILD", "analytics");    // false
 * billing.hasFeature("ENTERPRISE", "anything"); // true (wildcard)
 * ```
 */
export function createBillingConfig<T extends string>(
  input: PlansInput<T>
): BillingConfig<T> {
  const plans = {} as Record<T | "FREE", ResolvedPlan>;
  const planNames: T[] = [];

  // Resolve each plan definition
  for (const [name, def] of Object.entries(input) as [T, PlanDefinition][]) {
    if (name === "FREE") {
      plans["FREE" as T | "FREE"] = resolvePlan("FREE", def);
    } else {
      plans[name as T | "FREE"] = resolvePlan(name, def);
      planNames.push(name);
    }
  }

  // Ensure FREE plan exists
  if (!plans["FREE" as T | "FREE"]) {
    plans["FREE" as T | "FREE"] = FREE_PLAN;
  }

  const allPlanNames = ["FREE" as T | "FREE", ...planNames];

  function getPlan(name: string): ResolvedPlan {
    const upper = name.toUpperCase();
    return (plans as Record<string, ResolvedPlan>)[upper] ?? plans["FREE" as T | "FREE"];
  }

  function hasFeature(planName: string, feature: string): boolean {
    const plan = getPlan(planName);
    if (plan.features.includes("*")) return true;
    return plan.features.includes(feature);
  }

  function toShopifyBilling(): Record<string, ShopifyBillingPlan> {
    const result: Record<string, ShopifyBillingPlan> = {};

    for (const name of planNames) {
      const plan = plans[name as T | "FREE"];
      if (plan.amount === 0) continue; // Skip free plans

      const lineItem: ShopifyBillingPlan["lineItems"][0] = {
        amount: plan.amount,
        currencyCode: plan.currencyCode,
        interval: plan.interval,
        ...(plan.isUsageBased && plan.terms ? { terms: plan.terms } : {}),
      };

      const shopifyPlan: ShopifyBillingPlan = {
        lineItems: [lineItem],
      };

      if (plan.trialDays > 0) {
        shopifyPlan.trialDays = plan.trialDays;
      }

      result[plan.name] = shopifyPlan;
    }

    return result;
  }

  return {
    plans,
    planNames,
    allPlanNames,
    getPlan,
    hasFeature,
    toShopifyBilling,
  };
}
