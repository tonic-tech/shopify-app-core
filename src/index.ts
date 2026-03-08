// Database
export { createPrismaClient } from "./db.server.js";

// Environment
export {
  createEnvValidator,
  validateEnv,
  getEnv,
  isProduction,
  isDevelopment,
  type BaseEnv,
} from "./env.server.js";

// Logging
export { logger, hashForLog } from "./logger.server.js";

// Error Tracking
export {
  initSentry,
  captureException,
  captureMessage,
  addBreadcrumb,
  setUser,
  withErrorTracking,
} from "./sentry.server.js";

// Rate Limiting
export {
  checkRateLimitAsync,
  checkRateLimit,
  applyRateLimitAsync,
  applyRateLimit,
  rateLimitResponse,
  addRateLimitHeaders,
  RATE_LIMIT_CONFIGS,
  type RateLimitConfig,
  type RateLimitResult,
} from "./rate-limit.server.js";

// Security
export {
  SECURITY_HEADERS,
  addSecurityHeaders,
  createSecureHeaders,
  getCSPHeader,
  generateNonce,
} from "./security-headers.server.js";

// Validation
export {
  SubscriptionPayloadSchema,
  GDPRPayloadSchema,
  ChargeIdSchema,
  validateChargeId,
  createPlanValidator,
  validateSubscriptionPayload,
  validateGDPRPayload,
} from "./validation.server.js";

// Metafields
export {
  syncPlanMetafield,
  clearPlanMetafield,
  createMetafieldDefinitions,
} from "./metafields.server.js";

// Handler Factories
export {
  createHealthLoader,
  createGDPRAction,
  createUninstallAction,
  createSubscriptionAction,
} from "./handlers/index.js";
