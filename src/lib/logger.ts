/**
 * Logger for WB-CRM
 * Phase 9: Architecture Improvements - Logging
 *
 * Features:
 * - Environment-aware log levels (debug in dev, info in prod)
 * - Structured logging with metadata
 * - Sensitive data sanitization
 * - Child loggers with inherited context
 * - Timestamp and level included in output
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogMeta {
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  meta?: LogMeta;
}

export interface LoggerOptions {
  level?: LogLevel;
  context?: LogMeta;
  sensitiveKeys?: string[];
}

// Fields that should be redacted from logs
const DEFAULT_SENSITIVE_KEYS = [
  "password",
  "senha",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "authorization",
  "cookie",
  "creditCard",
  "cardNumber",
  "cvv",
  "ssn",
  "cpf",
  "cnpj",
];

// Log level priorities
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Creates a new logger instance
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  return new Logger(options);
}

export class Logger {
  private level: LogLevel;
  private context: LogMeta;
  private sensitiveKeys: string[];

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? this.getDefaultLevel();
    this.context = options.context ?? {};
    this.sensitiveKeys = [
      ...DEFAULT_SENSITIVE_KEYS,
      ...(options.sensitiveKeys ?? []),
    ];
  }

  private getDefaultLevel(): LogLevel {
    if (process.env.NODE_ENV === "production") {
      return "info";
    }
    return "debug";
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private sanitize(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj !== "object") {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitize(item));
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = this.sensitiveKeys.some((sensitive) =>
        lowerKey.includes(sensitive.toLowerCase())
      );

      if (isSensitive) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private formatEntry(entry: LogEntry): string {
    const { level, message, timestamp, meta } = entry;
    const prefix = `[${timestamp}] ${level.toUpperCase()}:`;

    if (meta && Object.keys(meta).length > 0) {
      const sanitizedMeta = this.sanitize(meta);
      return `${prefix} ${message} ${JSON.stringify(sanitizedMeta)}`;
    }

    return `${prefix} ${message}`;
  }

  log(level: LogLevel, message: string, meta?: LogMeta): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: this.getTimestamp(),
      meta: meta ? { ...this.context, ...meta } : this.context,
    };

    const formatted = this.formatEntry(entry);

    switch (level) {
      case "debug":
        console.debug(formatted);
        break;
      case "info":
        console.info(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "error":
        console.error(formatted);
        break;
    }
  }

  /**
   * Log a debug message (only in development)
   */
  debug(message: string, meta?: LogMeta): void {
    this.log("debug", message, meta);
  }

  /**
   * Log an info message
   */
  info(message: string, meta?: LogMeta): void {
    this.log("info", message, meta);
  }

  /**
   * Log a warning message
   */
  warn(message: string, meta?: LogMeta): void {
    this.log("warn", message, meta);
  }

  /**
   * Log an error message
   */
  error(message: string, meta?: LogMeta): void {
    this.log("error", message, meta);
  }

  /**
   * Creates a child logger with additional context
   */
  child(context: LogMeta): Logger {
    return new Logger({
      level: this.level,
      context: { ...this.context, ...context },
      sensitiveKeys: this.sensitiveKeys,
    });
  }

  /**
   * Sets the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Gets the current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }
}

// Default logger instance
export const logger = createLogger();

// ==================== Convenience Functions ====================

/**
 * Log action start
 */
export function logActionStart(
  actionName: string,
  userId?: string,
  meta?: LogMeta
): void {
  logger.info(`Action started: ${actionName}`, { actionName, userId, ...meta });
}

/**
 * Log action success
 */
export function logActionSuccess(
  actionName: string,
  userId?: string,
  meta?: LogMeta
): void {
  logger.info(`Action completed: ${actionName}`, { actionName, userId, ...meta });
}

/**
 * Log action error
 */
export function logActionError(
  actionName: string,
  error: Error,
  userId?: string,
  meta?: LogMeta
): void {
  logger.error(`Action failed: ${actionName}`, {
    actionName,
    userId,
    error: error.message,
    stack: error.stack,
    ...meta,
  });
}

/**
 * Log API request
 */
export function logRequest(
  method: string,
  path: string,
  userId?: string,
  meta?: LogMeta
): void {
  logger.info(`Request: ${method} ${path}`, { method, path, userId, ...meta });
}

/**
 * Log API response
 */
export function logResponse(
  method: string,
  path: string,
  status: number,
  duration: number,
  userId?: string
): void {
  const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
  logger.log(level, `Response: ${method} ${path} ${status} (${duration}ms)`, {
    method,
    path,
    status,
    duration,
    userId,
  });
}

/**
 * Log authentication event
 */
export function logAuth(
  event: "attempt" | "success" | "failure",
  email: string,
  meta?: LogMeta
): void {
  const level = event === "failure" ? "warn" : "info";
  const message = {
    attempt: "Login attempt",
    success: "Login successful",
    failure: "Login failed",
  }[event];

  logger.log(level, message, { event, email, ...meta });
}

// Export log method for direct access if needed
export const log = logger.log.bind(logger);
