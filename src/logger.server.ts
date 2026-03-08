/**
 * Structured Logger
 * Production-safe logging with severity levels, data redaction, and Sentry integration
 */

import { captureException } from "./sentry.server.js";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

const SENSITIVE_KEYS = [
  "password", "secret", "token", "accessToken", "apiKey", "api_key",
  "authorization", "cookie", "session", "credit_card", "creditCard",
  "ssn", "email",
];

function redactSensitive(data: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();

    if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk))) {
      redacted[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      redacted[key] = redactSensitive(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Hash a value for privacy-preserving logging (e.g., shop domain)
 */
export function hashForLog(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}

function formatLogEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    if (isProduction()) return;
    const entry: LogEntry = {
      level: "debug",
      message,
      timestamp: new Date().toISOString(),
      ...(meta ? redactSensitive(meta) : {}),
    };
    console.log(formatLogEntry(entry));
  },

  info(message: string, meta?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level: "info",
      message,
      timestamp: new Date().toISOString(),
      ...(meta ? redactSensitive(meta) : {}),
    };
    console.log(formatLogEntry(entry));
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level: "warn",
      message,
      timestamp: new Date().toISOString(),
      ...(meta ? redactSensitive(meta) : {}),
    };
    console.warn(formatLogEntry(entry));
  },

  error(message: string, error?: unknown, meta?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level: "error",
      message,
      timestamp: new Date().toISOString(),
      ...(meta ? redactSensitive(meta) : {}),
    };

    if (error instanceof Error) {
      entry.errorName = error.name;
      entry.errorMessage = error.message;
      if (!isProduction()) entry.stack = error.stack;

      captureException(error, { extra: meta }).catch(() => {});
    } else if (error !== undefined) {
      entry.errorValue = String(error);
    }

    console.error(formatLogEntry(entry));
  },

  webhook(
    topic: string,
    shop: string,
    status: "received" | "processed" | "failed",
    meta?: Record<string, unknown>
  ): void {
    this.info(`Webhook ${status}: ${topic}`, {
      topic,
      shopHash: hashForLog(shop),
      status,
      ...meta,
    });
  },

  billing(
    action: string,
    shop: string,
    plan: string,
    meta?: Record<string, unknown>
  ): void {
    this.info(`Billing: ${action}`, {
      action,
      shopHash: hashForLog(shop),
      plan,
      ...meta,
    });
  },

  api(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    meta?: Record<string, unknown>
  ): void {
    const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
    const entry: LogEntry = {
      level,
      message: `${method} ${path} ${statusCode}`,
      timestamp: new Date().toISOString(),
      method,
      path,
      statusCode,
      durationMs,
      ...(meta ? redactSensitive(meta) : {}),
    };

    if (level === "error") console.error(formatLogEntry(entry));
    else if (level === "warn") console.warn(formatLogEntry(entry));
    else console.log(formatLogEntry(entry));
  },
};

export default logger;
