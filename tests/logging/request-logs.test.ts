/**
 * Tests for Request/Response Logging
 * Phase 9: Architecture Improvements - Request Logging
 *
 * Verifies that API requests can be logged properly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logRequest, logResponse, createLogger } from "@/lib/logger";

describe("Request Logs", () => {
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

  // ==================== Request Logging ====================
  describe("logRequest", () => {
    it("should log request received", () => {
      logRequest("GET", "/api/deals", "user-123");

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("Request: GET /api/deals")
      );
    });

    it("should include method in log", () => {
      logRequest("POST", "/api/deals", "user-123");

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('"method":"POST"')
      );
    });

    it("should include path in log", () => {
      logRequest("GET", "/api/deals/123", "user-123");

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('"path":"/api/deals/123"')
      );
    });

    it("should include userId when authenticated", () => {
      logRequest("GET", "/api/deals", "user-123");

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('"userId":"user-123"')
      );
    });

    it("should handle undefined userId for unauthenticated requests", () => {
      logRequest("GET", "/api/deals", undefined);

      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("Request:")
      );
    });

    it("should include additional metadata", () => {
      logRequest("POST", "/api/deals", "user-123", {
        contentType: "application/json",
        contentLength: 256,
      });

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toContain('"contentType":"application/json"');
      expect(call).toContain('"contentLength":256');
    });
  });

  // ==================== Response Logging ====================
  describe("logResponse", () => {
    it("should log response sent", () => {
      logResponse("GET", "/api/deals", 200, 45, "user-123");

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("Response: GET /api/deals 200 (45ms)")
      );
    });

    it("should include duration in milliseconds", () => {
      logResponse("GET", "/api/deals", 200, 123, "user-123");

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("(123ms)")
      );
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('"duration":123')
      );
    });

    it("should include status code in metadata", () => {
      logResponse("GET", "/api/deals", 201, 50, "user-123");

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('"status":201')
      );
    });

    it("should include userId in metadata", () => {
      logResponse("GET", "/api/deals", 200, 50, "user-123");

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('"userId":"user-123"')
      );
    });

    it("should log 2xx responses as info", () => {
      logResponse("GET", "/api/deals", 200, 50, "user-123");
      logResponse("POST", "/api/deals", 201, 100, "user-123");
      logResponse("DELETE", "/api/deals/1", 204, 30, "user-123");

      expect(consoleSpy.info).toHaveBeenCalledTimes(3);
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it("should log 4xx responses as warning", () => {
      logResponse("GET", "/api/deals/999", 404, 10, "user-123");

      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.info).not.toHaveBeenCalled();
    });

    it("should log 400 Bad Request as warning", () => {
      logResponse("POST", "/api/deals", 400, 5, "user-123");

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining("400")
      );
    });

    it("should log 401 Unauthorized as warning", () => {
      logResponse("GET", "/api/deals", 401, 5, undefined);

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining("401")
      );
    });

    it("should log 403 Forbidden as warning", () => {
      logResponse("DELETE", "/api/deals/1", 403, 10, "user-123");

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining("403")
      );
    });

    it("should log 5xx responses as error", () => {
      logResponse("GET", "/api/deals", 500, 100, "user-123");

      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
    });

    it("should log 503 Service Unavailable as error", () => {
      logResponse("GET", "/api/deals", 503, 5000, "user-123");

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining("503")
      );
    });
  });

  // ==================== Sensitive Headers ====================
  describe("Sensitive Headers Exclusion", () => {
    it("should exclude authorization header from logs", () => {
      const logger = createLogger({ level: "info" });

      logger.info("Request headers", {
        authorization: "Bearer secret-token",
        accept: "application/json",
      });

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).not.toContain("secret-token");
      expect(call).toContain("[REDACTED]");
      expect(call).toContain("application/json");
    });

    it("should exclude cookie header from logs", () => {
      const logger = createLogger({ level: "info" });

      logger.info("Request headers", {
        cookie: "session=abc123; token=xyz",
        userAgent: "Mozilla/5.0",
      });

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).not.toContain("abc123");
      expect(call).not.toContain("xyz");
      expect(call).toContain("[REDACTED]");
    });

    it("should exclude multiple sensitive headers", () => {
      const logger = createLogger({ level: "info" });

      logger.info("Full request", {
        headers: {
          authorization: "Bearer token",
          cookie: "session=123",
          apiKey: "key-456",
          contentType: "application/json",
        },
      });

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).not.toContain("Bearer token");
      expect(call).not.toContain("session=123");
      expect(call).not.toContain("key-456");
      expect(call).toContain("application/json");
    });
  });
});
