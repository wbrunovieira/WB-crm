import { describe, it, expect } from "vitest";
import { organizationSchema } from "@/lib/validations/organization";

describe("Organization Hosting Validation", () => {
  describe("hasHosting field", () => {
    it("should accept hasHosting as true", () => {
      const data = {
        name: "Test Org",
        hasHosting: true,
        hostingRenewalDate: "2025-12-31",
      };

      const result = organizationSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hasHosting).toBe(true);
      }
    });

    it("should accept hasHosting as false", () => {
      const data = {
        name: "Test Org",
        hasHosting: false,
      };

      const result = organizationSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hasHosting).toBe(false);
      }
    });

    it("should default hasHosting to undefined when not provided", () => {
      const data = {
        name: "Test Org",
      };

      const result = organizationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("hostingRenewalDate field", () => {
    it("should accept valid date string", () => {
      const data = {
        name: "Test Org",
        hasHosting: true,
        hostingRenewalDate: "2025-12-31",
      };

      const result = organizationSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hostingRenewalDate).toBe("2025-12-31");
      }
    });

    it("should accept empty string for hostingRenewalDate", () => {
      const data = {
        name: "Test Org",
        hasHosting: false,
        hostingRenewalDate: "",
      };

      const result = organizationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should accept undefined hostingRenewalDate", () => {
      const data = {
        name: "Test Org",
        hasHosting: false,
      };

      const result = organizationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("hostingPlan field", () => {
    it("should accept valid hosting plan string", () => {
      const data = {
        name: "Test Org",
        hasHosting: true,
        hostingRenewalDate: "2025-12-31",
        hostingPlan: "Profissional",
      };

      const result = organizationSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hostingPlan).toBe("Profissional");
      }
    });

    it("should accept empty hostingPlan", () => {
      const data = {
        name: "Test Org",
        hostingPlan: "",
      };

      const result = organizationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("hostingValue field", () => {
    it("should accept valid positive number", () => {
      const data = {
        name: "Test Org",
        hasHosting: true,
        hostingRenewalDate: "2025-12-31",
        hostingValue: 150.0,
      };

      const result = organizationSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hostingValue).toBe(150.0);
      }
    });

    it("should accept zero as hostingValue", () => {
      const data = {
        name: "Test Org",
        hostingValue: 0,
      };

      const result = organizationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should accept undefined hostingValue", () => {
      const data = {
        name: "Test Org",
      };

      const result = organizationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("hostingReminderDays field", () => {
    it("should accept 7 days reminder", () => {
      const data = {
        name: "Test Org",
        hasHosting: true,
        hostingRenewalDate: "2025-12-31",
        hostingReminderDays: 7,
      };

      const result = organizationSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hostingReminderDays).toBe(7);
      }
    });

    it("should accept 15 days reminder", () => {
      const data = {
        name: "Test Org",
        hasHosting: true,
        hostingRenewalDate: "2025-12-31",
        hostingReminderDays: 15,
      };

      const result = organizationSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hostingReminderDays).toBe(15);
      }
    });

    it("should accept 30 days reminder", () => {
      const data = {
        name: "Test Org",
        hasHosting: true,
        hostingRenewalDate: "2025-12-31",
        hostingReminderDays: 30,
      };

      const result = organizationSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hostingReminderDays).toBe(30);
      }
    });

    it("should accept custom reminder days (e.g., 45)", () => {
      const data = {
        name: "Test Org",
        hasHosting: true,
        hostingRenewalDate: "2025-12-31",
        hostingReminderDays: 45,
      };

      const result = organizationSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hostingReminderDays).toBe(45);
      }
    });

    it("should reject negative reminder days", () => {
      const data = {
        name: "Test Org",
        hasHosting: true,
        hostingRenewalDate: "2025-12-31",
        hostingReminderDays: -5,
      };

      const result = organizationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject zero reminder days", () => {
      const data = {
        name: "Test Org",
        hasHosting: true,
        hostingRenewalDate: "2025-12-31",
        hostingReminderDays: 0,
      };

      const result = organizationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("hostingNotes field", () => {
    it("should accept hosting notes", () => {
      const data = {
        name: "Test Org",
        hasHosting: true,
        hostingRenewalDate: "2025-12-31",
        hostingNotes: "Cliente VIP, renovação automática",
      };

      const result = organizationSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hostingNotes).toBe("Cliente VIP, renovação automática");
      }
    });

    it("should accept empty hostingNotes", () => {
      const data = {
        name: "Test Org",
        hostingNotes: "",
      };

      const result = organizationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("complete hosting data", () => {
    it("should accept complete hosting configuration", () => {
      const data = {
        name: "Empresa ABC",
        legalName: "Empresa ABC Ltda",
        hasHosting: true,
        hostingRenewalDate: "2025-06-15",
        hostingPlan: "Enterprise",
        hostingValue: 299.9,
        hostingReminderDays: 30,
        hostingNotes: "Renovação anual, contato: financeiro@empresa.com",
      };

      const result = organizationSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hasHosting).toBe(true);
        expect(result.data.hostingRenewalDate).toBe("2025-06-15");
        expect(result.data.hostingPlan).toBe("Enterprise");
        expect(result.data.hostingValue).toBe(299.9);
        expect(result.data.hostingReminderDays).toBe(30);
        expect(result.data.hostingNotes).toBe("Renovação anual, contato: financeiro@empresa.com");
      }
    });

    it("should accept organization without any hosting fields", () => {
      const data = {
        name: "Empresa Sem Hosting",
        email: "contato@empresa.com",
      };

      const result = organizationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});
