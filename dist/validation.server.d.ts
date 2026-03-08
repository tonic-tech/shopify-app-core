import { z } from "zod";
/**
 * Shared Zod schemas for Shopify webhook payloads
 */
export declare const SubscriptionPayloadSchema: z.ZodObject<{
    app_subscription: z.ZodOptional<z.ZodObject<{
        name: z.ZodString;
        status: z.ZodString;
        admin_graphql_api_id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: string;
        name: string;
        admin_graphql_api_id: string;
    }, {
        status: string;
        name: string;
        admin_graphql_api_id: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    app_subscription?: {
        status: string;
        name: string;
        admin_graphql_api_id: string;
    } | undefined;
}, {
    app_subscription?: {
        status: string;
        name: string;
        admin_graphql_api_id: string;
    } | undefined;
}>;
export declare const GDPRPayloadSchema: z.ZodObject<{
    shop_id: z.ZodOptional<z.ZodNumber>;
    shop_domain: z.ZodOptional<z.ZodString>;
    orders_requested: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    customer: z.ZodOptional<z.ZodObject<{
        id: z.ZodNumber;
        email: z.ZodString;
        phone: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: number;
        email: string;
        phone?: string | undefined;
    }, {
        id: number;
        email: string;
        phone?: string | undefined;
    }>>;
    orders_to_redact: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    data_request: z.ZodOptional<z.ZodObject<{
        id: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: number;
    }, {
        id: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    shop_id?: number | undefined;
    shop_domain?: string | undefined;
    orders_requested?: number[] | undefined;
    customer?: {
        id: number;
        email: string;
        phone?: string | undefined;
    } | undefined;
    orders_to_redact?: number[] | undefined;
    data_request?: {
        id: number;
    } | undefined;
}, {
    shop_id?: number | undefined;
    shop_domain?: string | undefined;
    orders_requested?: number[] | undefined;
    customer?: {
        id: number;
        email: string;
        phone?: string | undefined;
    } | undefined;
    orders_to_redact?: number[] | undefined;
    data_request?: {
        id: number;
    } | undefined;
}>;
export declare const ChargeIdSchema: z.ZodEffects<z.ZodString, string, string>;
export declare function validateChargeId(chargeId: unknown): string | null;
/**
 * Create a plan validator for app-specific plan names
 *
 * @example
 * ```ts
 * const { validatePlan } = createPlanValidator(["STARTER", "PRO", "ENTERPRISE"]);
 * const plan = validatePlan("pro"); // "PRO"
 * ```
 */
export declare function createPlanValidator<T extends string>(validPlans: readonly T[]): {
    validatePlan: (planName: unknown) => T | "FREE";
};
export declare function validateSubscriptionPayload(payload: unknown): {
    app_subscription?: {
        status: string;
        name: string;
        admin_graphql_api_id: string;
    } | undefined;
} | null;
export declare function validateGDPRPayload(payload: unknown): {
    shop_id?: number | undefined;
    shop_domain?: string | undefined;
    orders_requested?: number[] | undefined;
    customer?: {
        id: number;
        email: string;
        phone?: string | undefined;
    } | undefined;
    orders_to_redact?: number[] | undefined;
    data_request?: {
        id: number;
    } | undefined;
} | null;
//# sourceMappingURL=validation.server.d.ts.map