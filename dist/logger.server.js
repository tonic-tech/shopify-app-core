/**
 * Structured Logger
 * Production-safe logging with severity levels, data redaction, and Sentry integration
 */
import { captureException } from "./sentry.server.js";
const SENSITIVE_KEYS = [
    "password", "secret", "token", "accessToken", "apiKey", "api_key",
    "authorization", "cookie", "session", "credit_card", "creditCard",
    "ssn", "email",
];
function redactSensitive(data) {
    const redacted = {};
    for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk))) {
            redacted[key] = "[REDACTED]";
        }
        else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            redacted[key] = redactSensitive(value);
        }
        else {
            redacted[key] = value;
        }
    }
    return redacted;
}
/**
 * Hash a value for privacy-preserving logging (e.g., shop domain)
 */
export function hashForLog(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        const char = value.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return `hash_${Math.abs(hash).toString(16)}`;
}
function formatLogEntry(entry) {
    return JSON.stringify(entry);
}
function isProduction() {
    return process.env.NODE_ENV === "production";
}
export const logger = {
    debug(message, meta) {
        if (isProduction())
            return;
        const entry = {
            level: "debug",
            message,
            timestamp: new Date().toISOString(),
            ...(meta ? redactSensitive(meta) : {}),
        };
        console.log(formatLogEntry(entry));
    },
    info(message, meta) {
        const entry = {
            level: "info",
            message,
            timestamp: new Date().toISOString(),
            ...(meta ? redactSensitive(meta) : {}),
        };
        console.log(formatLogEntry(entry));
    },
    warn(message, meta) {
        const entry = {
            level: "warn",
            message,
            timestamp: new Date().toISOString(),
            ...(meta ? redactSensitive(meta) : {}),
        };
        console.warn(formatLogEntry(entry));
    },
    error(message, error, meta) {
        const entry = {
            level: "error",
            message,
            timestamp: new Date().toISOString(),
            ...(meta ? redactSensitive(meta) : {}),
        };
        if (error instanceof Error) {
            entry.errorName = error.name;
            entry.errorMessage = error.message;
            if (!isProduction())
                entry.stack = error.stack;
            captureException(error, { extra: meta }).catch(() => { });
        }
        else if (error !== undefined) {
            entry.errorValue = String(error);
        }
        console.error(formatLogEntry(entry));
    },
    webhook(topic, shop, status, meta) {
        this.info(`Webhook ${status}: ${topic}`, {
            topic,
            shopHash: hashForLog(shop),
            status,
            ...meta,
        });
    },
    billing(action, shop, plan, meta) {
        this.info(`Billing: ${action}`, {
            action,
            shopHash: hashForLog(shop),
            plan,
            ...meta,
        });
    },
    api(method, path, statusCode, durationMs, meta) {
        const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
        const entry = {
            level,
            message: `${method} ${path} ${statusCode}`,
            timestamp: new Date().toISOString(),
            method,
            path,
            statusCode,
            durationMs,
            ...(meta ? redactSensitive(meta) : {}),
        };
        if (level === "error")
            console.error(formatLogEntry(entry));
        else if (level === "warn")
            console.warn(formatLogEntry(entry));
        else
            console.log(formatLogEntry(entry));
    },
};
export default logger;
//# sourceMappingURL=logger.server.js.map