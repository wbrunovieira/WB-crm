/**
 * Tests for Action Logging Integration
 * Phase 9: Architecture Improvements - Logging Integration
 *
 * Verifies that actions can be logged properly when logging is integrated
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  logActionStart,
  logActionSuccess,
  logActionError,
  logAuth,
} from "@/lib/logger";

describe("Action Logs Integration", () => {
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

  // ==================== Create Operations ====================
  describe("createDeal Logging", () => {
    it("should log success on deal creation", () => {
      // Simulate what would happen in createDeal action
      logActionStart("createDeal", "user-123", { title: "New Deal" });
      logActionSuccess("createDeal", "user-123", { dealId: "deal-456" });

      expect(consoleSpy.info).toHaveBeenCalledTimes(2);
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("Action started: createDeal")
      );
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("Action completed: createDeal")
      );
    });

    it("should log error on deal creation failure", () => {
      const error = new Error("Database connection failed");

      logActionStart("createDeal", "user-123");
      logActionError("createDeal", error, "user-123");

      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining("Action failed: createDeal")
      );
    });
  });

  // ==================== Update Operations ====================
  describe("updateDeal Logging", () => {
    it("should log changes on deal update", () => {
      const changes = {
        title: { from: "Old Title", to: "New Title" },
        value: { from: 1000, to: 2000 },
      };

      logActionStart("updateDeal", "user-123", { dealId: "deal-456" });
      logActionSuccess("updateDeal", "user-123", { changes });

      expect(consoleSpy.info).toHaveBeenCalledTimes(2);
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("updateDeal")
      );
    });

    it("should log error on update failure", () => {
      const error = new Error("Record not found");

      logActionStart("updateDeal", "user-123", { dealId: "deal-456" });
      logActionError("updateDeal", error, "user-123");

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining("Record not found")
      );
    });
  });

  // ==================== Delete Operations ====================
  describe("deleteDeal Logging", () => {
    it("should log deletion", () => {
      logActionStart("deleteDeal", "user-123", { dealId: "deal-456" });
      logActionSuccess("deleteDeal", "user-123", {
        deletedId: "deal-456",
        title: "Deleted Deal",
      });

      expect(consoleSpy.info).toHaveBeenCalledTimes(2);
    });

    it("should log deletion error", () => {
      const error = new Error("Cannot delete: has related records");

      logActionStart("deleteDeal", "user-123", { dealId: "deal-456" });
      logActionError("deleteDeal", error, "user-123");

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining("Cannot delete")
      );
    });
  });

  // ==================== Lead Conversion ====================
  describe("convertLead Logging", () => {
    it("should log conversion process", () => {
      logActionStart("convertLeadToOrganization", "user-123", {
        leadId: "lead-123",
      });
      logActionSuccess("convertLeadToOrganization", "user-123", {
        leadId: "lead-123",
        organizationId: "org-456",
        contactsConverted: 3,
      });

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("convertLeadToOrganization")
      );
    });

    it("should log conversion failure", () => {
      const error = new Error("Lead already converted");

      logActionStart("convertLeadToOrganization", "user-123", {
        leadId: "lead-123",
      });
      logActionError("convertLeadToOrganization", error, "user-123");

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining("Lead already converted")
      );
    });
  });

  // ==================== Authentication ====================
  describe("Login Logging", () => {
    it("should log login attempt", () => {
      logAuth("attempt", "user@example.com", { ip: "192.168.1.1" });

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("Login attempt")
      );
    });

    it("should log successful login", () => {
      logAuth("success", "user@example.com", { userId: "user-123" });

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("Login successful")
      );
    });

    it("should log failed login as warning", () => {
      logAuth("failure", "user@example.com", { reason: "Invalid password" });

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining("Login failed")
      );
    });

    it("should not log sensitive data in auth logs", () => {
      // The logger should sanitize password if accidentally included
      logAuth("attempt", "user@example.com", { password: "secret123" } as any);

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).not.toContain("secret123");
      expect(call).toContain("[REDACTED]");
    });
  });

  // ==================== Metadata ====================
  describe("Log Metadata", () => {
    it("should include action name in metadata", () => {
      logActionStart("createContact", "user-123");

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('"actionName":"createContact"')
      );
    });

    it("should include user ID in metadata", () => {
      logActionStart("createContact", "user-123");

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('"userId":"user-123"')
      );
    });

    it("should include additional context", () => {
      logActionStart("createDeal", "user-123", {
        stageId: "stage-1",
        contactId: "contact-1",
      });

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toContain('"stageId":"stage-1"');
      expect(call).toContain('"contactId":"contact-1"');
    });

    it("should include error details on failure", () => {
      const error = new Error("Validation failed");
      error.stack = "Error: Validation failed\n    at validateData";

      logActionError("createDeal", error, "user-123");

      const call = consoleSpy.error.mock.calls[0][0];
      expect(call).toContain('"error":"Validation failed"');
      expect(call).toContain('"stack"');
    });
  });
});
