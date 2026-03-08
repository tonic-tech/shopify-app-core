import { z, type ZodObject, type ZodRawShape } from "zod";

/**
 * Base Shopify app env vars — all apps need these
 */
const BaseEnvSchema = z.object({
  SHOPIFY_API_KEY: z.string().min(1, "SHOPIFY_API_KEY is required"),
  SHOPIFY_API_SECRET: z.string().min(1, "SHOPIFY_API_SECRET is required"),
  SHOPIFY_APP_URL: z.string().url("SHOPIFY_APP_URL must be a valid URL"),
  SCOPES: z.string().min(1, "SCOPES is required"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().optional().default("3000"),
  SHOP_CUSTOM_DOMAIN: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  REDIS_URL: z.string().optional(),
  TONIC_AUTH_BASE_URL: z.string().url().optional(),
  TONIC_LINK_API_SECRET: z.string().optional(),
});

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
export function createEnvValidator<T extends ZodRawShape>(
  extraSchema?: ZodObject<T>
) {
  const schema = extraSchema ? BaseEnvSchema.merge(extraSchema) : BaseEnvSchema;

  type Env = z.infer<typeof schema>;
  let validated: Env | null = null;

  function validateEnv(): Env {
    if (validated) return validated;

    const result = schema.safeParse(process.env);

    if (!result.success) {
      const formatted = result.error.format();
      const errors = Object.entries(formatted)
        .filter(([key]) => key !== "_errors")
        .map(([key, value]) => {
          const errorMessages = (value as { _errors?: string[] })?._errors || [];
          return `  - ${key}: ${errorMessages.join(", ")}`;
        })
        .join("\n");

      console.error("Environment validation failed:\n" + errors);
      throw new Error(`Invalid environment configuration:\n${errors}`);
    }

    validated = result.data as Env;
    return validated;
  }

  function getEnv(): Env {
    if (!validated) return validateEnv();
    return validated;
  }

  function isProduction(): boolean {
    return getEnv().NODE_ENV === "production";
  }

  function isDevelopment(): boolean {
    return getEnv().NODE_ENV === "development";
  }

  return { validateEnv, getEnv, isProduction, isDevelopment };
}

// Default validator (no extra schema)
const defaultValidator = createEnvValidator();
export const validateEnv = defaultValidator.validateEnv;
export const getEnv = defaultValidator.getEnv;
export const isProduction = defaultValidator.isProduction;
export const isDevelopment = defaultValidator.isDevelopment;
