import type { PlansInput, BillingConfig } from "./types.js";
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
export declare function createBillingConfig<T extends string>(input: PlansInput<T>): BillingConfig<T>;
//# sourceMappingURL=config.d.ts.map