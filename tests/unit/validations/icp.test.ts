/**
 * ICP Validation Tests
 *
 * Tests for src/lib/validations/icp.ts
 * - ICP schema validation (name, slug, content, status)
 * - LeadICP link validation
 * - OrganizationICP link validation
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect } from "vitest";
import {
  icpSchema,
  icpUpdateSchema,
  leadICPSchema,
  organizationICPSchema,
  type ICPFormData,
} from "@/lib/validations/icp";

describe("ICP Validation", () => {
  describe("icpSchema - creating ICP", () => {
    describe("name field", () => {
      it("should accept valid name", () => {
        const data = {
          name: "Startup de Tecnologia",
          slug: "startup-tech",
          content: "Descrição do ICP...",
        };

        const result = icpSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Startup de Tecnologia");
        }
      });

      it("should reject empty name", () => {
        const data = {
          name: "",
          slug: "startup-tech",
          content: "Descrição...",
        };

        const result = icpSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it("should reject name with less than 2 characters", () => {
        const data = {
          name: "A",
          slug: "a",
          content: "Descrição...",
        };

        const result = icpSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it("should reject name longer than 100 characters", () => {
        const data = {
          name: "A".repeat(101),
          slug: "long-name",
          content: "Descrição...",
        };

        const result = icpSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe("slug field", () => {
      it("should accept valid slug", () => {
        const data = {
          name: "E-commerce Médio",
          slug: "ecommerce-medio",
          content: "Descrição...",
        };

        const result = icpSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.slug).toBe("ecommerce-medio");
        }
      });

      it("should accept slug with numbers", () => {
        const data = {
          name: "Tech B2B",
          slug: "tech-b2b-2024",
          content: "Descrição...",
        };

        const result = icpSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should reject slug with uppercase letters", () => {
        const data = {
          name: "Test",
          slug: "Test-Slug",
          content: "Descrição...",
        };

        const result = icpSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it("should reject slug with spaces", () => {
        const data = {
          name: "Test",
          slug: "test slug",
          content: "Descrição...",
        };

        const result = icpSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it("should reject slug with special characters", () => {
        const data = {
          name: "Test",
          slug: "test_slug!",
          content: "Descrição...",
        };

        const result = icpSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it("should reject slug shorter than 2 characters", () => {
        const data = {
          name: "Test",
          slug: "a",
          content: "Descrição...",
        };

        const result = icpSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe("content field", () => {
      it("should accept valid content", () => {
        const data = {
          name: "Test ICP",
          slug: "test-icp",
          content: "Este é o perfil ideal de cliente...",
        };

        const result = icpSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should accept long content (up to 10000 chars)", () => {
        const data = {
          name: "Test ICP",
          slug: "test-icp",
          content: "A".repeat(10000),
        };

        const result = icpSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should reject content longer than 10000 characters", () => {
        const data = {
          name: "Test ICP",
          slug: "test-icp",
          content: "A".repeat(10001),
        };

        const result = icpSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it("should reject empty content", () => {
        const data = {
          name: "Test ICP",
          slug: "test-icp",
          content: "",
        };

        const result = icpSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe("status field", () => {
      it("should accept 'draft' status", () => {
        const data = {
          name: "Test ICP",
          slug: "test-icp",
          content: "Descrição...",
          status: "draft",
        };

        const result = icpSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe("draft");
        }
      });

      it("should accept 'active' status", () => {
        const data = {
          name: "Test ICP",
          slug: "test-icp",
          content: "Descrição...",
          status: "active",
        };

        const result = icpSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should accept 'archived' status", () => {
        const data = {
          name: "Test ICP",
          slug: "test-icp",
          content: "Descrição...",
          status: "archived",
        };

        const result = icpSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it("should default to 'draft' when status not provided", () => {
        const data = {
          name: "Test ICP",
          slug: "test-icp",
          content: "Descrição...",
        };

        const result = icpSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe("draft");
        }
      });

      it("should reject invalid status", () => {
        const data = {
          name: "Test ICP",
          slug: "test-icp",
          content: "Descrição...",
          status: "invalid",
        };

        const result = icpSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("icpUpdateSchema - updating ICP", () => {
    it("should accept partial updates", () => {
      const data = {
        name: "Updated Name",
      };

      const result = icpUpdateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should accept changeReason field", () => {
      const data = {
        content: "Updated content...",
        changeReason: "Refinamento do perfil após feedback",
      };

      const result = icpUpdateSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.changeReason).toBe("Refinamento do perfil após feedback");
      }
    });

    it("should reject changeReason longer than 500 characters", () => {
      const data = {
        content: "Updated content...",
        changeReason: "A".repeat(501),
      };

      const result = icpUpdateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("leadICPSchema - linking Lead to ICP", () => {
    it("should accept valid link data", () => {
      const data = {
        leadId: "lead-123",
        icpId: "icp-456",
      };

      const result = leadICPSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should accept link with matchScore", () => {
      const data = {
        leadId: "lead-123",
        icpId: "icp-456",
        matchScore: 85,
      };

      const result = leadICPSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.matchScore).toBe(85);
      }
    });

    it("should reject matchScore below 0", () => {
      const data = {
        leadId: "lead-123",
        icpId: "icp-456",
        matchScore: -1,
      };

      const result = leadICPSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject matchScore above 100", () => {
      const data = {
        leadId: "lead-123",
        icpId: "icp-456",
        matchScore: 101,
      };

      const result = leadICPSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should accept link with notes", () => {
      const data = {
        leadId: "lead-123",
        icpId: "icp-456",
        notes: "Excelente fit, atende todos os critérios",
      };

      const result = leadICPSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should require leadId", () => {
      const data = {
        icpId: "icp-456",
      };

      const result = leadICPSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should require icpId", () => {
      const data = {
        leadId: "lead-123",
      };

      const result = leadICPSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("organizationICPSchema - linking Organization to ICP", () => {
    it("should accept valid link data", () => {
      const data = {
        organizationId: "org-123",
        icpId: "icp-456",
      };

      const result = organizationICPSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should accept link with matchScore", () => {
      const data = {
        organizationId: "org-123",
        icpId: "icp-456",
        matchScore: 90,
      };

      const result = organizationICPSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject matchScore below 0", () => {
      const data = {
        organizationId: "org-123",
        icpId: "icp-456",
        matchScore: -5,
      };

      const result = organizationICPSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject matchScore above 100", () => {
      const data = {
        organizationId: "org-123",
        icpId: "icp-456",
        matchScore: 150,
      };

      const result = organizationICPSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should require organizationId", () => {
      const data = {
        icpId: "icp-456",
      };

      const result = organizationICPSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should require icpId", () => {
      const data = {
        organizationId: "org-123",
      };

      const result = organizationICPSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
