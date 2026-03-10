import type { AdminGraphQL, UsageRecordInput, UsageRecordResult } from "./types.js";
/**
 * Create a usage record for metered billing.
 *
 * Wraps the `appUsageRecordCreate` GraphQL mutation with error handling
 * for capped amount limits and idempotency.
 *
 * @example
 * ```ts
 * const result = await createUsageRecord(admin, {
 *   subscriptionLineItemId: "gid://shopify/AppSubscriptionLineItem/123",
 *   amount: 0.50,
 *   description: "50 API calls",
 *   idempotencyKey: `usage-${shopDomain}-${Date.now()}`,
 * });
 *
 * if (result.cappedAmountExceeded) {
 *   // Notify merchant they've hit their usage cap
 * }
 * ```
 */
export declare function createUsageRecord(admin: AdminGraphQL, input: UsageRecordInput): Promise<UsageRecordResult>;
//# sourceMappingURL=usage.d.ts.map