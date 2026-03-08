import { z } from "zod";
/**
 * Shared Zod schemas for Shopify webhook payloads
 */
export const SubscriptionPayloadSchema = z.object({
    app_subscription: z.object({
        name: z.string(),
        status: z.string(),
        admin_graphql_api_id: z.string(),
    }).optional(),
});
export const GDPRPayloadSchema = z.object({
    shop_id: z.number().optional(),
    shop_domain: z.string().optional(),
    orders_requested: z.array(z.number()).optional(),
    customer: z.object({
        id: z.number(),
        email: z.string(),
        phone: z.string().optional(),
    }).optional(),
    orders_to_redact: z.array(z.number()).optional(),
    data_request: z.object({
        id: z.number(),
    }).optional(),
});
export const ChargeIdSchema = z.string().refine((val) => {
    if (/^gid:\/\/shopify\/AppSubscription\/\d+$/.test(val))
        return true;
    if (/^\d+$/.test(val))
        return true;
    return false;
}, { message: "Invalid charge_id format" });
export function validateChargeId(chargeId) {
    if (typeof chargeId !== "string" || !chargeId)
        return null;
    const result = ChargeIdSchema.safeParse(chargeId);
    if (!result.success) {
        console.warn(`Invalid charge_id format: ${chargeId}`);
        return null;
    }
    return result.data;
}
/**
 * Create a plan validator for app-specific plan names
 *
 * @example
 * ```ts
 * const { validatePlan } = createPlanValidator(["STARTER", "PRO", "ENTERPRISE"]);
 * const plan = validatePlan("pro"); // "PRO"
 * ```
 */
export function createPlanValidator(validPlans) {
    function validatePlan(planName) {
        if (typeof planName !== "string") {
            console.warn(`Invalid plan type received: ${typeof planName}`);
            return "FREE";
        }
        const upperPlan = planName.toUpperCase();
        if (validPlans.includes(upperPlan)) {
            return upperPlan;
        }
        if (upperPlan === "FREE")
            return "FREE";
        console.warn(`Invalid plan name received: ${planName}, defaulting to FREE`);
        return "FREE";
    }
    return { validatePlan };
}
export function validateSubscriptionPayload(payload) {
    const result = SubscriptionPayloadSchema.safeParse(payload);
    if (!result.success) {
        console.error("Invalid subscription payload:", result.error.format());
        return null;
    }
    return result.data;
}
export function validateGDPRPayload(payload) {
    const result = GDPRPayloadSchema.safeParse(payload);
    if (!result.success) {
        console.error("Invalid GDPR payload:", result.error.format());
        return null;
    }
    return result.data;
}
//# sourceMappingURL=validation.server.js.map