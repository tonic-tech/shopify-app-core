/**
 * Structured Logger
 * Production-safe logging with severity levels, data redaction, and Sentry integration
 */
/**
 * Hash a value for privacy-preserving logging (e.g., shop domain)
 */
export declare function hashForLog(value: string): string;
export declare const logger: {
    debug(message: string, meta?: Record<string, unknown>): void;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, error?: unknown, meta?: Record<string, unknown>): void;
    webhook(topic: string, shop: string, status: "received" | "processed" | "failed", meta?: Record<string, unknown>): void;
    billing(action: string, shop: string, plan: string, meta?: Record<string, unknown>): void;
    api(method: string, path: string, statusCode: number, durationMs: number, meta?: Record<string, unknown>): void;
};
export default logger;
//# sourceMappingURL=logger.server.d.ts.map