/**
 * Tests for Deal Tech Stack Actions
 * Phase 6: Tech Profile & Tech Stack - Deal linking functionality
 *
 * Actions tested:
 * - getDealTechStack
 * - addCategoryToDeal / removeCategoryFromDeal
 * - addLanguageToDeal / removeLanguageFromDeal / setPrimaryLanguage
 * - addFrameworkToDeal / removeFrameworkFromDeal
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Valid CUID format for testing
const DEAL_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxd1";
const CATEGORY_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxc1";
const CATEGORY_ID_2 = "clxxxxxxxxxxxxxxxxxxxxxxxxc2";
const LANGUAGE_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxl1";
const LANGUAGE_ID_2 = "clxxxxxxxxxxxxxxxxxxxxxxxxl2";
const FRAMEWORK_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxf1";
const FRAMEWORK_ID_2 = "clxxxxxxxxxxxxxxxxxxxxxxxxf2";

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock auth options
vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    dealTechStack: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    dealLanguage: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    dealFramework: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import {
  getDealTechStack,
  addCategoryToDeal,
  removeCategoryFromDeal,
  addLanguageToDeal,
  removeLanguageFromDeal,
  setPrimaryLanguage,
  addFrameworkToDeal,
  removeFrameworkFromDeal,
} from "@/actions/deal-tech-stack";

describe("Deal Tech Stack Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== GET DEAL TECH STACK ====================
  describe("getDealTechStack", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(getDealTechStack(DEAL_ID)).rejects.toThrow("Não autorizado");
    });

    it("should return categories, languages, and frameworks for a deal", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      const mockCategories = [
        { id: "1", dealId: DEAL_ID, techCategoryId: CATEGORY_ID, techCategory: { id: CATEGORY_ID, name: "Frontend" } },
      ];
      const mockLanguages = [
        { id: "1", dealId: DEAL_ID, languageId: LANGUAGE_ID, isPrimary: true, language: { id: LANGUAGE_ID, name: "TypeScript" } },
      ];
      const mockFrameworks = [
        { id: "1", dealId: DEAL_ID, frameworkId: FRAMEWORK_ID, framework: { id: FRAMEWORK_ID, name: "React" } },
      ];

      vi.mocked(prisma.dealTechStack.findMany).mockResolvedValue(mockCategories as any);
      vi.mocked(prisma.dealLanguage.findMany).mockResolvedValue(mockLanguages as any);
      vi.mocked(prisma.dealFramework.findMany).mockResolvedValue(mockFrameworks as any);

      const result = await getDealTechStack(DEAL_ID);

      expect(result.categories).toEqual(mockCategories);
      expect(result.languages).toEqual(mockLanguages);
      expect(result.frameworks).toEqual(mockFrameworks);
    });

    it("should return empty arrays when deal has no tech stack", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.dealTechStack.findMany).mockResolvedValue([]);
      vi.mocked(prisma.dealLanguage.findMany).mockResolvedValue([]);
      vi.mocked(prisma.dealFramework.findMany).mockResolvedValue([]);

      const result = await getDealTechStack(DEAL_ID);

      expect(result.categories).toEqual([]);
      expect(result.languages).toEqual([]);
      expect(result.frameworks).toEqual([]);
    });
  });

  // ==================== ADD CATEGORY TO DEAL ====================
  describe("addCategoryToDeal", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(addCategoryToDeal(DEAL_ID, CATEGORY_ID)).rejects.toThrow("Não autorizado");
    });

    it("should add a category to a deal", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.dealTechStack.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.dealTechStack.create).mockResolvedValue({
        id: "link-1",
        dealId: DEAL_ID,
        techCategoryId: CATEGORY_ID,
        techCategory: { id: CATEGORY_ID, name: "Frontend" },
      } as any);

      const result = await addCategoryToDeal(DEAL_ID, CATEGORY_ID);

      expect(prisma.dealTechStack.findUnique).toHaveBeenCalledWith({
        where: {
          dealId_techCategoryId: {
            dealId: DEAL_ID,
            techCategoryId: CATEGORY_ID,
          },
        },
      });
      expect(prisma.dealTechStack.create).toHaveBeenCalledWith({
        data: {
          dealId: DEAL_ID,
          techCategoryId: CATEGORY_ID,
        },
        include: {
          techCategory: true,
        },
      });
      expect(result.techCategory.name).toBe("Frontend");
    });

    it("should throw error when category already linked to deal", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.dealTechStack.findUnique).mockResolvedValue({
        id: "existing",
        dealId: DEAL_ID,
        techCategoryId: CATEGORY_ID,
      } as any);

      await expect(addCategoryToDeal(DEAL_ID, CATEGORY_ID)).rejects.toThrow(
        "Esta categoria já está vinculada ao deal"
      );
    });
  });

  // ==================== REMOVE CATEGORY FROM DEAL ====================
  describe("removeCategoryFromDeal", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(removeCategoryFromDeal(DEAL_ID, CATEGORY_ID)).rejects.toThrow("Não autorizado");
    });

    it("should remove a category from a deal", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.dealTechStack.delete).mockResolvedValue({} as any);

      await removeCategoryFromDeal(DEAL_ID, CATEGORY_ID);

      expect(prisma.dealTechStack.delete).toHaveBeenCalledWith({
        where: {
          dealId_techCategoryId: {
            dealId: DEAL_ID,
            techCategoryId: CATEGORY_ID,
          },
        },
      });
    });
  });

  // ==================== ADD LANGUAGE TO DEAL ====================
  describe("addLanguageToDeal", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(addLanguageToDeal(DEAL_ID, LANGUAGE_ID)).rejects.toThrow("Não autorizado");
    });

    it("should add a language to a deal without isPrimary", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.dealLanguage.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.dealLanguage.create).mockResolvedValue({
        id: "link-1",
        dealId: DEAL_ID,
        languageId: LANGUAGE_ID,
        isPrimary: false,
        language: { id: LANGUAGE_ID, name: "TypeScript" },
      } as any);

      const result = await addLanguageToDeal(DEAL_ID, LANGUAGE_ID);

      expect(prisma.dealLanguage.create).toHaveBeenCalledWith({
        data: {
          dealId: DEAL_ID,
          languageId: LANGUAGE_ID,
          isPrimary: false,
        },
        include: {
          language: true,
        },
      });
      expect(result.isPrimary).toBe(false);
    });

    it("should add a language as primary and unset other primaries", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.dealLanguage.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.dealLanguage.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.dealLanguage.create).mockResolvedValue({
        id: "link-1",
        dealId: DEAL_ID,
        languageId: LANGUAGE_ID,
        isPrimary: true,
        language: { id: LANGUAGE_ID, name: "TypeScript" },
      } as any);

      const result = await addLanguageToDeal(DEAL_ID, LANGUAGE_ID, true);

      expect(prisma.dealLanguage.updateMany).toHaveBeenCalledWith({
        where: { dealId: DEAL_ID },
        data: { isPrimary: false },
      });
      expect(result.isPrimary).toBe(true);
    });

    it("should throw error when language already linked to deal", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.dealLanguage.findUnique).mockResolvedValue({
        id: "existing",
        dealId: DEAL_ID,
        languageId: LANGUAGE_ID,
      } as any);

      await expect(addLanguageToDeal(DEAL_ID, LANGUAGE_ID)).rejects.toThrow(
        "Esta linguagem já está vinculada ao deal"
      );
    });
  });

  // ==================== REMOVE LANGUAGE FROM DEAL ====================
  describe("removeLanguageFromDeal", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(removeLanguageFromDeal(DEAL_ID, LANGUAGE_ID)).rejects.toThrow("Não autorizado");
    });

    it("should remove a language from a deal", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.dealLanguage.delete).mockResolvedValue({} as any);

      await removeLanguageFromDeal(DEAL_ID, LANGUAGE_ID);

      expect(prisma.dealLanguage.delete).toHaveBeenCalledWith({
        where: {
          dealId_languageId: {
            dealId: DEAL_ID,
            languageId: LANGUAGE_ID,
          },
        },
      });
    });
  });

  // ==================== SET PRIMARY LANGUAGE ====================
  describe("setPrimaryLanguage", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(setPrimaryLanguage(DEAL_ID, LANGUAGE_ID)).rejects.toThrow("Não autorizado");
    });

    it("should set a language as primary and unset others", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.dealLanguage.updateMany).mockResolvedValue({ count: 2 });
      vi.mocked(prisma.dealLanguage.update).mockResolvedValue({
        id: "link-1",
        dealId: DEAL_ID,
        languageId: LANGUAGE_ID,
        isPrimary: true,
      } as any);

      await setPrimaryLanguage(DEAL_ID, LANGUAGE_ID);

      expect(prisma.dealLanguage.updateMany).toHaveBeenCalledWith({
        where: { dealId: DEAL_ID },
        data: { isPrimary: false },
      });
      expect(prisma.dealLanguage.update).toHaveBeenCalledWith({
        where: {
          dealId_languageId: {
            dealId: DEAL_ID,
            languageId: LANGUAGE_ID,
          },
        },
        data: { isPrimary: true },
      });
    });
  });

  // ==================== ADD FRAMEWORK TO DEAL ====================
  describe("addFrameworkToDeal", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(addFrameworkToDeal(DEAL_ID, FRAMEWORK_ID)).rejects.toThrow("Não autorizado");
    });

    it("should add a framework to a deal", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.dealFramework.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.dealFramework.create).mockResolvedValue({
        id: "link-1",
        dealId: DEAL_ID,
        frameworkId: FRAMEWORK_ID,
        framework: { id: FRAMEWORK_ID, name: "React" },
      } as any);

      const result = await addFrameworkToDeal(DEAL_ID, FRAMEWORK_ID);

      expect(prisma.dealFramework.findUnique).toHaveBeenCalledWith({
        where: {
          dealId_frameworkId: {
            dealId: DEAL_ID,
            frameworkId: FRAMEWORK_ID,
          },
        },
      });
      expect(prisma.dealFramework.create).toHaveBeenCalledWith({
        data: {
          dealId: DEAL_ID,
          frameworkId: FRAMEWORK_ID,
        },
        include: {
          framework: true,
        },
      });
      expect(result.framework.name).toBe("React");
    });

    it("should throw error when framework already linked to deal", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.dealFramework.findUnique).mockResolvedValue({
        id: "existing",
        dealId: DEAL_ID,
        frameworkId: FRAMEWORK_ID,
      } as any);

      await expect(addFrameworkToDeal(DEAL_ID, FRAMEWORK_ID)).rejects.toThrow(
        "Este framework já está vinculado ao deal"
      );
    });
  });

  // ==================== REMOVE FRAMEWORK FROM DEAL ====================
  describe("removeFrameworkFromDeal", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(removeFrameworkFromDeal(DEAL_ID, FRAMEWORK_ID)).rejects.toThrow("Não autorizado");
    });

    it("should remove a framework from a deal", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.dealFramework.delete).mockResolvedValue({} as any);

      await removeFrameworkFromDeal(DEAL_ID, FRAMEWORK_ID);

      expect(prisma.dealFramework.delete).toHaveBeenCalledWith({
        where: {
          dealId_frameworkId: {
            dealId: DEAL_ID,
            frameworkId: FRAMEWORK_ID,
          },
        },
      });
    });
  });

  // ==================== MULTIPLE TECH STACK ITEMS ====================
  describe("Multiple tech stack items", () => {
    it("should support adding multiple categories to a deal", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.dealTechStack.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.dealTechStack.create)
        .mockResolvedValueOnce({
          id: "link-1",
          dealId: DEAL_ID,
          techCategoryId: CATEGORY_ID,
          techCategory: { id: CATEGORY_ID, name: "Frontend" },
        } as any)
        .mockResolvedValueOnce({
          id: "link-2",
          dealId: DEAL_ID,
          techCategoryId: CATEGORY_ID_2,
          techCategory: { id: CATEGORY_ID_2, name: "Backend" },
        } as any);

      const result1 = await addCategoryToDeal(DEAL_ID, CATEGORY_ID);
      const result2 = await addCategoryToDeal(DEAL_ID, CATEGORY_ID_2);

      expect(result1.techCategory.name).toBe("Frontend");
      expect(result2.techCategory.name).toBe("Backend");
    });

    it("should support adding multiple languages with one primary", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.dealLanguage.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.dealLanguage.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.dealLanguage.create)
        .mockResolvedValueOnce({
          id: "link-1",
          dealId: DEAL_ID,
          languageId: LANGUAGE_ID,
          isPrimary: true,
          language: { id: LANGUAGE_ID, name: "TypeScript" },
        } as any)
        .mockResolvedValueOnce({
          id: "link-2",
          dealId: DEAL_ID,
          languageId: LANGUAGE_ID_2,
          isPrimary: false,
          language: { id: LANGUAGE_ID_2, name: "Python" },
        } as any);

      const result1 = await addLanguageToDeal(DEAL_ID, LANGUAGE_ID, true);
      const result2 = await addLanguageToDeal(DEAL_ID, LANGUAGE_ID_2, false);

      expect(result1.isPrimary).toBe(true);
      expect(result2.isPrimary).toBe(false);
    });

    it("should support adding multiple frameworks to a deal", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.dealFramework.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.dealFramework.create)
        .mockResolvedValueOnce({
          id: "link-1",
          dealId: DEAL_ID,
          frameworkId: FRAMEWORK_ID,
          framework: { id: FRAMEWORK_ID, name: "React" },
        } as any)
        .mockResolvedValueOnce({
          id: "link-2",
          dealId: DEAL_ID,
          frameworkId: FRAMEWORK_ID_2,
          framework: { id: FRAMEWORK_ID_2, name: "Next.js" },
        } as any);

      const result1 = await addFrameworkToDeal(DEAL_ID, FRAMEWORK_ID);
      const result2 = await addFrameworkToDeal(DEAL_ID, FRAMEWORK_ID_2);

      expect(result1.framework.name).toBe("React");
      expect(result2.framework.name).toBe("Next.js");
    });
  });
});
