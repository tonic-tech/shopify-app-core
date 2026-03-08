/**
 * Sentry Error Tracking
 * Optional integration — only active when SENTRY_DSN is set
 * Install: npm install @sentry/remix
 */
let sentryClient = null;
let sentryInitialized = false;
export async function initSentry() {
    if (sentryInitialized)
        return sentryClient !== null;
    sentryInitialized = true;
    const dsn = process.env.SENTRY_DSN;
    if (!dsn)
        return false;
    try {
        // @ts-expect-error — @sentry/remix is an optional peer dependency
        const Sentry = (await import("@sentry/remix")); // eslint-disable-line
        Sentry.init({
            dsn,
            environment: process.env.NODE_ENV || "development",
            release: process.env.npm_package_version,
            tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
            enabled: process.env.NODE_ENV === "production",
            sendDefaultPii: false,
            ignoreErrors: [
                "ResizeObserver loop limit exceeded",
                "ResizeObserver loop completed with undelivered notifications",
                "Failed to fetch",
                "NetworkError",
                "Load failed",
                "Unauthorized",
            ],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            beforeSend(event) {
                if (event.request?.headers) {
                    delete event.request.headers["authorization"];
                    delete event.request.headers["cookie"];
                    delete event.request.headers["x-shopify-access-token"];
                }
                if (event.request?.query_string) {
                    event.request.query_string = event.request.query_string
                        .replace(/token=[^&]+/g, "token=[REDACTED]")
                        .replace(/key=[^&]+/g, "key=[REDACTED]");
                }
                return event;
            },
        });
        sentryClient = {
            captureException: (error, context) => Sentry.captureException(error, { extra: context }),
            captureMessage: (message, level = "info") => Sentry.captureMessage(message, level),
            setTag: Sentry.setTag,
            setUser: Sentry.setUser,
            addBreadcrumb: Sentry.addBreadcrumb,
        };
        console.log("[sentry] Initialized error tracking");
        return true;
    }
    catch {
        console.warn("[sentry] @sentry/remix not installed, error tracking disabled");
        return false;
    }
}
export async function captureException(error, context) {
    await initSentry();
    if (!sentryClient) {
        console.error("[error]", error.message, context);
        return null;
    }
    if (context?.shop)
        sentryClient.setTag("shop", context.shop);
    if (context?.route)
        sentryClient.setTag("route", context.route);
    if (context?.userId)
        sentryClient.setUser({ id: context.userId });
    return sentryClient.captureException(error, context?.extra);
}
export async function captureMessage(message, level = "info") {
    await initSentry();
    if (!sentryClient) {
        console.log(`[${level}]`, message);
        return null;
    }
    return sentryClient.captureMessage(message, level);
}
export async function addBreadcrumb(message, category, data) {
    await initSentry();
    sentryClient?.addBreadcrumb({ message, category, level: "info", data });
}
export async function setUser(user) {
    await initSentry();
    sentryClient?.setUser(user);
}
export function withErrorTracking(fn, context) {
    return (async (...args) => {
        try {
            return await fn(...args);
        }
        catch (error) {
            if (error instanceof Error) {
                await captureException(error, context);
            }
            throw error;
        }
    });
}
//# sourceMappingURL=sentry.server.js.map