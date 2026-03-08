import { z, type ZodObject, type ZodRawShape } from "zod";
/**
 * Base Shopify app env vars — all apps need these
 */
declare const BaseEnvSchema: z.ZodObject<{
    SHOPIFY_API_KEY: z.ZodString;
    SHOPIFY_API_SECRET: z.ZodString;
    SHOPIFY_APP_URL: z.ZodString;
    SCOPES: z.ZodString;
    DATABASE_URL: z.ZodString;
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    PORT: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    SHOP_CUSTOM_DOMAIN: z.ZodOptional<z.ZodString>;
    SENTRY_DSN: z.ZodOptional<z.ZodString>;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    TONIC_AUTH_BASE_URL: z.ZodOptional<z.ZodString>;
    TONIC_LINK_API_SECRET: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    SHOPIFY_API_KEY: string;
    SHOPIFY_API_SECRET: string;
    SHOPIFY_APP_URL: string;
    SCOPES: string;
    DATABASE_URL: string;
    NODE_ENV: "development" | "production" | "test";
    PORT: string;
    SHOP_CUSTOM_DOMAIN?: string | undefined;
    SENTRY_DSN?: string | undefined;
    REDIS_URL?: string | undefined;
    TONIC_AUTH_BASE_URL?: string | undefined;
    TONIC_LINK_API_SECRET?: string | undefined;
}, {
    SHOPIFY_API_KEY: string;
    SHOPIFY_API_SECRET: string;
    SHOPIFY_APP_URL: string;
    SCOPES: string;
    DATABASE_URL: string;
    NODE_ENV?: "development" | "production" | "test" | undefined;
    PORT?: string | undefined;
    SHOP_CUSTOM_DOMAIN?: string | undefined;
    SENTRY_DSN?: string | undefined;
    REDIS_URL?: string | undefined;
    TONIC_AUTH_BASE_URL?: string | undefined;
    TONIC_LINK_API_SECRET?: string | undefined;
}>;
export type BaseEnv = z.infer<typeof BaseEnvSchema>;
/**
 * Create an env validator that extends the base schema with app-specific vars
 *
 * @example
 * ```ts
 * const { validateEnv, getEnv } = createEnvValidator(z.object({
 *   GTM_DEFAULT_CONSENT: z.string().optional(),
 * }));
 * ```
 */
export declare function createEnvValidator<T extends ZodRawShape>(extraSchema?: ZodObject<T>): {
    validateEnv: () => {
        SHOPIFY_API_KEY: string;
        SHOPIFY_API_SECRET: string;
        SHOPIFY_APP_URL: string;
        SCOPES: string;
        DATABASE_URL: string;
        NODE_ENV: "development" | "production" | "test";
        PORT: string;
        SHOP_CUSTOM_DOMAIN?: string | undefined;
        SENTRY_DSN?: string | undefined;
        REDIS_URL?: string | undefined;
        TONIC_AUTH_BASE_URL?: string | undefined;
        TONIC_LINK_API_SECRET?: string | undefined;
    } | (z.objectUtil.addQuestionMarks<z.baseObjectOutputType<z.objectUtil.extendShape<{
        SHOPIFY_API_KEY: z.ZodString;
        SHOPIFY_API_SECRET: z.ZodString;
        SHOPIFY_APP_URL: z.ZodString;
        SCOPES: z.ZodString;
        DATABASE_URL: z.ZodString;
        NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
        PORT: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        SHOP_CUSTOM_DOMAIN: z.ZodOptional<z.ZodString>;
        SENTRY_DSN: z.ZodOptional<z.ZodString>;
        REDIS_URL: z.ZodOptional<z.ZodString>;
        TONIC_AUTH_BASE_URL: z.ZodOptional<z.ZodString>;
        TONIC_LINK_API_SECRET: z.ZodOptional<z.ZodString>;
    }, T>>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never);
    getEnv: () => {
        SHOPIFY_API_KEY: string;
        SHOPIFY_API_SECRET: string;
        SHOPIFY_APP_URL: string;
        SCOPES: string;
        DATABASE_URL: string;
        NODE_ENV: "development" | "production" | "test";
        PORT: string;
        SHOP_CUSTOM_DOMAIN?: string | undefined;
        SENTRY_DSN?: string | undefined;
        REDIS_URL?: string | undefined;
        TONIC_AUTH_BASE_URL?: string | undefined;
        TONIC_LINK_API_SECRET?: string | undefined;
    } | (z.objectUtil.addQuestionMarks<z.baseObjectOutputType<z.objectUtil.extendShape<{
        SHOPIFY_API_KEY: z.ZodString;
        SHOPIFY_API_SECRET: z.ZodString;
        SHOPIFY_APP_URL: z.ZodString;
        SCOPES: z.ZodString;
        DATABASE_URL: z.ZodString;
        NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
        PORT: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        SHOP_CUSTOM_DOMAIN: z.ZodOptional<z.ZodString>;
        SENTRY_DSN: z.ZodOptional<z.ZodString>;
        REDIS_URL: z.ZodOptional<z.ZodString>;
        TONIC_AUTH_BASE_URL: z.ZodOptional<z.ZodString>;
        TONIC_LINK_API_SECRET: z.ZodOptional<z.ZodString>;
    }, T>>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never);
    isProduction: () => boolean;
    isDevelopment: () => boolean;
};
export declare const validateEnv: () => {
    SHOPIFY_API_KEY: string;
    SHOPIFY_API_SECRET: string;
    SHOPIFY_APP_URL: string;
    SCOPES: string;
    DATABASE_URL: string;
    NODE_ENV: "development" | "production" | "test";
    PORT: string;
    SHOP_CUSTOM_DOMAIN?: string | undefined;
    SENTRY_DSN?: string | undefined;
    REDIS_URL?: string | undefined;
    TONIC_AUTH_BASE_URL?: string | undefined;
    TONIC_LINK_API_SECRET?: string | undefined;
} | {
    [x: string]: any;
};
export declare const getEnv: () => {
    SHOPIFY_API_KEY: string;
    SHOPIFY_API_SECRET: string;
    SHOPIFY_APP_URL: string;
    SCOPES: string;
    DATABASE_URL: string;
    NODE_ENV: "development" | "production" | "test";
    PORT: string;
    SHOP_CUSTOM_DOMAIN?: string | undefined;
    SENTRY_DSN?: string | undefined;
    REDIS_URL?: string | undefined;
    TONIC_AUTH_BASE_URL?: string | undefined;
    TONIC_LINK_API_SECRET?: string | undefined;
} | {
    [x: string]: any;
};
export declare const isProduction: () => boolean;
export declare const isDevelopment: () => boolean;
export {};
//# sourceMappingURL=env.server.d.ts.map