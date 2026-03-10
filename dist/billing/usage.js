import { logger } from "../logger.server.js";
const USAGE_RECORD_MUTATION = `
  mutation AppUsageRecordCreate(
    $subscriptionLineItemId: ID!
    $price: MoneyInput!
    $description: String!
    $idempotencyKey: String
  ) {
    appUsageRecordCreate(
      subscriptionLineItemId: $subscriptionLineItemId
      price: $price
      description: $description
      idempotencyKey: $idempotencyKey
    ) {
      appUsageRecord {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;
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
export async function createUsageRecord(admin, input) {
    const variables = {
        subscriptionLineItemId: input.subscriptionLineItemId,
        price: {
            amount: input.amount,
            currencyCode: input.currencyCode ?? "USD",
        },
        description: input.description,
    };
    if (input.idempotencyKey) {
        variables.idempotencyKey = input.idempotencyKey;
    }
    try {
        const response = await admin.graphql(USAGE_RECORD_MUTATION, { variables });
        const data = await response.json();
        const result = data.data?.appUsageRecordCreate;
        if (result?.userErrors?.length > 0) {
            const errors = result.userErrors;
            const errorMsg = errors.map((e) => e.message).join(", ");
            // Check for capped amount exceeded
            const isCapped = errors.some((e) => e.message.toLowerCase().includes("capped") ||
                e.message.toLowerCase().includes("exceed"));
            if (isCapped) {
                logger.billing("usage_capped", input.shopDomain ?? "unknown", "N/A", {
                    subscriptionLineItemId: input.subscriptionLineItemId,
                    amount: input.amount,
                });
                return { success: false, cappedAmountExceeded: true, error: errorMsg };
            }
            logger.error("Usage record creation failed", undefined, { errors: errorMsg });
            return { success: false, error: errorMsg };
        }
        const recordId = result?.appUsageRecord?.id;
        if (!recordId) {
            logger.error("Usage record creation returned no record ID", undefined, {
                shopDomain: input.shopDomain ?? "unknown",
                subscriptionLineItemId: input.subscriptionLineItemId,
            });
            return { success: false, error: "No usage record ID returned" };
        }
        logger.billing("usage_recorded", input.shopDomain ?? "unknown", "N/A", {
            usageRecordId: recordId,
            amount: input.amount,
            description: input.description,
        });
        return { success: true, usageRecordId: recordId };
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        logger.error("Usage record creation threw", error, {
            shopDomain: input.shopDomain ?? "unknown",
            subscriptionLineItemId: input.subscriptionLineItemId,
        });
        return { success: false, error: msg };
    }
}
//# sourceMappingURL=usage.js.map