/**
 * Billing module types for @tonic/shopify-app-core
 *
 * Provides type-safe billing plan definitions, plan enforcement,
 * charge confirmation handling, and usage record creation.
 */

// ---------------------------------------------------------------------------
// Plan Configuration
// ---------------------------------------------------------------------------

/** Matches Shopify's BillingInterval enum values */
export type BillingInterval = "EVERY_30_DAYS" | "ANNUAL" | "USAGE";

/** Input for defining a billing plan */
export interface PlanDefinition {
  /** Monthly/annual price. Use 0 for free plans. */
  amount: number;
  /** ISO 4217 currency code. Defaults to "USD". */
  currencyCode?: string;
  /** Billing interval. Defaults to "EVERY_30_DAYS". Ignored for free plans. */
  interval?: BillingInterval;
  /** Number of free trial days. */
  trialDays?: number;
  /** Feature slugs included in this plan. Use ["*"] for all features. */
  features?: string[];
  /** For usage-based plans: maximum charge per billing cycle. */
  cappedAmount?: number;
  /** For usage-based plans: terms shown to the merchant. */
  terms?: string;
}

/** Plans map input — keys are plan names, values are definitions */
export type PlansInput<T extends string = string> = Record<T, PlanDefinition>;

/** Resolved plan with all defaults applied */
export interface ResolvedPlan {
  name: string;
  amount: number;
  currencyCode: string;
  interval: BillingInterval;
  trialDays: number;
  features: string[];
  isUsageBased: boolean;
  cappedAmount?: number;
  terms?: string;
}

/** Shape matching @shopify/shopify-app-remix billing line item */
export interface ShopifyBillingLineItem {
  amount: number;
  currencyCode: string;
  interval: string;
  terms?: string;
}

/** Shape matching @shopify/shopify-app-remix billing plan config */
export interface ShopifyBillingPlan {
  lineItems: ShopifyBillingLineItem[];
  trialDays?: number;
}

/** Billing config object returned by createBillingConfig */
export interface BillingConfig<T extends string = string> {
  /** All resolved plans keyed by name (includes FREE) */
  plans: Record<T | "FREE", ResolvedPlan>;
  /** Paid plan names only (excludes FREE) */
  planNames: T[];
  /** All plan names including FREE */
  allPlanNames: (T | "FREE")[];
  /** Look up a resolved plan by name. Returns FREE plan for unknown names. */
  getPlan: (name: string) => ResolvedPlan;
  /** Check if a plan includes a specific feature */
  hasFeature: (planName: string, feature: string) => boolean;
  /** Convert to the shape expected by shopifyApp({ billing }) — excludes FREE */
  toShopifyBilling: () => Record<string, ShopifyBillingPlan>;
}

// ---------------------------------------------------------------------------
// Plan Enforcement (Middleware)
// ---------------------------------------------------------------------------

export interface RequirePlanOptions<T extends string = string> {
  /** Require the merchant to be on one of these specific plans */
  plans?: T[];
  /** Require the merchant's plan to include ALL of these features */
  features?: string[];
  /** ORM callback: get the current plan name for a shop */
  getShopPlan: (shopDomain: string) => Promise<string>;
  /** The billing config to check against */
  billingConfig: BillingConfig<T>;
  /** URL to redirect to when the plan is insufficient */
  upgradeUrl: string;
}

export interface PlanCheckResult {
  currentPlan: string;
  resolvedPlan: ResolvedPlan;
  authorized: boolean;
}

// ---------------------------------------------------------------------------
// Charge Confirmation
// ---------------------------------------------------------------------------

export interface ChargeConfirmationOps {
  /** Called when a merchant approves a charge */
  onChargeConfirmed: (shopDomain: string, plan: string, subscriptionId: string) => Promise<void>;
  /** Called when a merchant declines a charge */
  onChargeDeclined: (shopDomain: string) => Promise<void>;
}

export interface ChargeConfirmationOptions {
  namespace: string;
  appName?: import("../tonic-link.types.js").TonicAppName;
  tonicLink?: import("../tonic-link.server.js").TonicLinkClient;
  /** URL to redirect to after processing confirmation. Defaults to "/app". */
  successRedirectUrl?: string;
  /** URL to redirect to after a declined charge. Defaults to "/app/billing". */
  declinedRedirectUrl?: string;
}

// ---------------------------------------------------------------------------
// Usage Records
// ---------------------------------------------------------------------------

export type AdminGraphQL = {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
};

export interface UsageRecordInput {
  /** The subscription line item GID to record usage against */
  subscriptionLineItemId: string;
  /** The amount to charge */
  amount: number;
  /** Currency code. Defaults to "USD". */
  currencyCode?: string;
  /** Description shown on the merchant's invoice */
  description: string;
  /** Idempotency key to prevent double-charging */
  idempotencyKey?: string;
}

export interface UsageRecordResult {
  success: boolean;
  usageRecordId?: string;
  cappedAmountExceeded?: boolean;
  error?: string;
}
