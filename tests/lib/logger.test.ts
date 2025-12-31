/**
 * Tests for Logger
 * Phase 9: Architecture Improvements - Logging
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  Logger,
  createLogger,
  logger,
  logActionStart,
  logActionSuccess,
  logActionError,
  logRequest,
  logResponse,
  logAuth,
} from "@/lib/logger";

describe("Logger", () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
      info: vi.spyOn(console, "info").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== Logger Methods ====================
  describe("Logger Methods", () => {
    it("should export info, warn, error, debug methods", () => {
      const log = createLogger();

      expect(typeof log.info).toBe("function");
      expect(typeof log.warn).toBe("function");
      expect(typeof log.error).toBe("function");
      expect(typeof log.debug).toBe("function");
    });

    it("should log info messages", () => {
      const log = createLogger({ level: "info" });

      log.info("Test message");

      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("INFO:")
      );
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("Test message")
      );
    });

    it("should log error messages", () => {
      const log = createLogger({ level: "error" });

      log.error("Error occurred");

      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining("ERROR:")
      );
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining("Error occurred")
      );
    });

    it("should log warn messages", () => {
      const log = createLogger({ level: "warn" });

      log.warn("Warning message");

      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining("WARN:")
      );
    });

    it("should log debug messages in debug level", () => {
      const log = createLogger({ level: "debug" });

      log.debug("Debug info");

      expect(consoleSpy.debug).toHaveBeenCalledTimes(1);
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining("DEBUG:")
      );
    });

    it("should not log debug messages when level is info", () => {
      const log = createLogger({ level: "info" });

      log.debug("Debug info");

      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });
  });

  // ==================== Timestamp ====================
  describe("Timestamp", () => {
    it("should include timestamp in log output", () => {
      const log = createLogger({ level: "info" });

      log.info("Test");

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      );
    });

    it("should use ISO format for timestamp", () => {
      const log = createLogger({ level: "info" });

      log.info("Test");

      const call = consoleSpy.info.mock.calls[0][0];
      // Extract timestamp from log format: [2024-12-31T10:30:00.000Z]
      const match = call.match(/\[([^\]]+)\]/);
      expect(match).not.toBeNull();
      expect(() => new Date(match![1])).not.toThrow();
    });
  });

  // ==================== Log Level ====================
  describe("Log Level", () => {
    it("should include level in log output", () => {
      const log = createLogger({ level: "info" });

      log.info("Test");

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("INFO:")
      );
    });

    it("should respect log level hierarchy", () => {
      const log = createLogger({ level: "warn" });

      log.debug("Debug");
      log.info("Info");
      log.warn("Warn");
      log.error("Error");

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });

    it("should allow changing log level", () => {
      const log = createLogger({ level: "error" });

      log.info("Before");
      expect(consoleSpy.info).not.toHaveBeenCalled();

      log.setLevel("info");

      log.info("After");
      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
    });

    it("should return current log level", () => {
      const log = createLogger({ level: "warn" });

      expect(log.getLevel()).toBe("warn");
    });
  });

  // ==================== Metadata ====================
  describe("Metadata", () => {
    it("should accept metadata object", () => {
      const log = createLogger({ level: "info" });

      log.info("User action", { userId: "123", action: "login" });

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('"userId":"123"')
      );
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('"action":"login"')
      );
    });

    it("should handle empty metadata", () => {
      const log = createLogger({ level: "info" });

      log.info("Simple message");

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("Simple message")
      );
    });

    it("should handle nested metadata", () => {
      const log = createLogger({ level: "info" });

      log.info("Complex", {
        user: { id: "123", name: "Test" },
        action: "update",
      });

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('"user"')
      );
    });
  });

  // ==================== Sensitive Data ====================
  describe("Sensitive Data Sanitization", () => {
    it("should redact password fields", () => {
      const log = createLogger({ level: "info" });

      log.info("Login", { email: "test@example.com", password: "secret123" });

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toContain('"password":"[REDACTED]"');
      expect(call).not.toContain("secret123");
    });

    it("should redact token fields", () => {
      const log = createLogger({ level: "info" });

      log.info("Auth", { token: "abc123xyz", userId: "123" });

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toContain('"token":"[REDACTED]"');
      expect(call).not.toContain("abc123xyz");
    });

    it("should redact nested sensitive fields", () => {
      const log = createLogger({ level: "info" });

      log.info("Request", {
        user: { email: "test@example.com", password: "secret" },
      });

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toContain('"password":"[REDACTED]"');
      expect(call).not.toContain("secret");
    });

    it("should redact authorization header", () => {
      const log = createLogger({ level: "info" });

      log.info("Request headers", {
        authorization: "Bearer token123",
        contentType: "application/json",
      });

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toContain('"authorization":"[REDACTED]"');
      expect(call).not.toContain("Bearer");
    });

    it("should redact apiKey fields", () => {
      const log = createLogger({ level: "info" });

      log.info("Config", { apiKey: "key-12345", endpoint: "/api" });

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toContain('"apiKey":"[REDACTED]"');
      expect(call).not.toContain("key-12345");
    });

    it("should allow custom sensitive keys", () => {
      const log = createLogger({
        level: "info",
        sensitiveKeys: ["customSecret"],
      });

      log.info("Data", { customSecret: "hidden", visible: "shown" });

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toContain('"customSecret":"[REDACTED]"');
      expect(call).toContain('"visible":"shown"');
    });
  });

  // ==================== Child Logger ====================
  describe("Child Logger", () => {
    it("should inherit context from parent", () => {
      const log = createLogger({ level: "info" });
      const childLog = log.child({ requestId: "req-123" });

      childLog.info("Processing");

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('"requestId":"req-123"')
      );
    });

    it("should merge additional context", () => {
      const log = createLogger({
        level: "info",
        context: { service: "api" },
      });
      const childLog = log.child({ requestId: "req-123" });

      childLog.info("Processing");

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toContain('"service":"api"');
      expect(call).toContain('"requestId":"req-123"');
    });

    it("should inherit log level", () => {
      const log = createLogger({ level: "warn" });
      const childLog = log.child({ context: "test" });

      childLog.info("Info message");
      childLog.warn("Warn message");

      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
    });

    it("should inherit sensitive keys", () => {
      const log = createLogger({
        level: "info",
        sensitiveKeys: ["mySecret"],
      });
      const childLog = log.child({ context: "test" });

      childLog.info("Data", { mySecret: "hidden" });

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toContain('"mySecret":"[REDACTED]"');
    });
  });

  // ==================== Default Logger ====================
  describe("Default Logger Instance", () => {
    it("should export a default logger instance", () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe("function");
    });
  });
});

// ==================== Convenience Functions ====================
describe("Logging Convenience Functions", () => {
  let consoleSpy: {
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      info: vi.spyOn(console, "info").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("logActionStart", () => {
    it("should log action start", () => {
      logActionStart("createDeal", "user-123");

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("Action started: createDeal")
      );
    });

    it("should include userId in metadata", () => {
      logActionStart("createDeal", "user-123");

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('"userId":"user-123"')
      );
    });
  });

  describe("logActionSuccess", () => {
    it("should log action completion", () => {
      logActionSuccess("createDeal", "user-123");

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("Action completed: createDeal")
      );
    });
  });

  describe("logActionError", () => {
    it("should log action failure", () => {
      const error = new Error("Something went wrong");
      logActionError("createDeal", error, "user-123");

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining("Action failed: createDeal")
      );
    });

    it("should include error message", () => {
      const error = new Error("Database error");
      logActionError("createDeal", error, "user-123");

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining("Database error")
      );
    });
  });

  describe("logRequest", () => {
    it("should log request details", () => {
      logRequest("GET", "/api/deals", "user-123");

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("Request: GET /api/deals")
      );
    });
  });

  describe("logResponse", () => {
    it("should log response details", () => {
      logResponse("GET", "/api/deals", 200, 45, "user-123");

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("Response: GET /api/deals 200 (45ms)")
      );
    });

    it("should log warning for 4xx responses", () => {
      logResponse("GET", "/api/deals", 404, 10, "user-123");

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining("404")
      );
    });

    it("should log error for 5xx responses", () => {
      logResponse("GET", "/api/deals", 500, 10, "user-123");

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining("500")
      );
    });
  });

  describe("logAuth", () => {
    it("should log login attempt", () => {
      logAuth("attempt", "user@example.com");

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("Login attempt")
      );
    });

    it("should log login success", () => {
      logAuth("success", "user@example.com");

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("Login successful")
      );
    });

    it("should log login failure as warning", () => {
      logAuth("failure", "user@example.com");

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining("Login failed")
      );
    });
  });
});
