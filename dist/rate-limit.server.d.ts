/**
 * Rate Limiting
 * Redis-capable with in-memory fallback for single-instance deployments
 */
export interface RateLimitConfig {
    limit: number;
    windowMs: number;
    keyGenerator?: (identifier: string) => string;
}
export declare const RATE_LIMIT_CONFIGS: {
    readonly api: {
        readonly limit: 100;
        readonly windowMs: 60000;
    };
    readonly billing: {
        readonly limit: 20;
        readonly windowMs: 60000;
    };
    readonly webhook: {
        readonly limit: 500;
        readonly windowMs: 60000;
    };
    readonly auth: {
        readonly limit: 10;
        readonly windowMs: 60000;
    };
};
export interface RateLimitResult {
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfter: number;
}
export declare function checkRateLimitAsync(identifier: string, config?: RateLimitConfig): Promise<RateLimitResult>;
export declare function checkRateLimit(identifier: string, config?: RateLimitConfig): RateLimitResult;
export declare function rateLimitResponse(result: RateLimitResult): Response;
export declare function applyRateLimitAsync(identifier: string, config?: RateLimitConfig): Promise<Response | null>;
export declare function applyRateLimit(identifier: string, config?: RateLimitConfig): Response | null;
export declare function addRateLimitHeaders(response: Response, result: RateLimitResult): Response;
//# sourceMappingURL=rate-limit.server.d.ts.map