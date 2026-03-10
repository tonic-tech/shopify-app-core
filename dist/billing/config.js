const FREE_PLAN = {
    name: "FREE",
    amount: 0,
    currencyCode: "USD",
    interval: "EVERY_30_DAYS",
    trialDays: 0,
    features: [],
    isUsageBased: false,
};
function resolvePlan(name, def) {
    const interval = def.amount === 0
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
export function createBillingConfig(input) {
    const plans = {};
    const planNames = [];
    // Resolve each plan definition
    for (const [name, def] of Object.entries(input)) {
        if (name === "FREE") {
            plans["FREE"] = resolvePlan("FREE", def);
        }
        else {
            plans[name] = resolvePlan(name, def);
            planNames.push(name);
        }
    }
    // Ensure FREE plan exists
    if (!plans["FREE"]) {
        plans["FREE"] = FREE_PLAN;
    }
    const allPlanNames = ["FREE", ...planNames];
    function getPlan(name) {
        const upper = name.toUpperCase();
        return plans[upper] ?? plans["FREE"];
    }
    function hasFeature(planName, feature) {
        const plan = getPlan(planName);
        if (plan.features.includes("*"))
            return true;
        return plan.features.includes(feature);
    }
    function toShopifyBilling() {
        const result = {};
        for (const name of planNames) {
            const plan = plans[name];
            if (plan.amount === 0)
                continue; // Skip free plans
            const lineItem = {
                amount: plan.amount,
                currencyCode: plan.currencyCode,
                interval: plan.interval,
                ...(plan.isUsageBased && plan.terms ? { terms: plan.terms } : {}),
            };
            const shopifyPlan = {
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
//# sourceMappingURL=config.js.map