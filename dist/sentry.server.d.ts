/**
 * Sentry Error Tracking
 * Optional integration — only active when SENTRY_DSN is set
 * Install: npm install @sentry/remix
 */
export declare function initSentry(): Promise<boolean>;
export declare function captureException(error: Error, context?: {
    shop?: string;
    userId?: string;
    route?: string;
    extra?: Record<string, unknown>;
}): Promise<string | null>;
export declare function captureMessage(message: string, level?: "info" | "warning" | "error"): Promise<string | null>;
export declare function addBreadcrumb(message: string, category?: string, data?: Record<string, unknown>): Promise<void>;
export declare function setUser(user: {
    id: string;
    email?: string;
} | null): Promise<void>;
export declare function withErrorTracking<T extends (...args: unknown[]) => Promise<unknown>>(fn: T, context?: {
    route?: string;
}): T;
//# sourceMappingURL=sentry.server.d.ts.map