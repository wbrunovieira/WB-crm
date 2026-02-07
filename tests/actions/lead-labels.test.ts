/**
 * Tests for Lead Multi-Labels Feature
 * TDD: Tests written BEFORE implementation
 *
 * Feature: Support multiple labels per Lead (many-to-many relationship)
 *
 * Actions to implement:
 * - addLabelToLead(leadId, labelId)
 * - removeLabelFromLead(leadId, labelId)
 * - getLeadLabels(leadId)
 * - setLeadLabels(leadId, labelIds[]) - replace all labels
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Valid CUID format for testing
const USER_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxu1";
const LEAD_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxld";
const LABEL_ID_1 = "clxxxxxxxxxxxxxxxxxxxxxxxxxl1";
const LABEL_ID_2 = "clxxxxxxxxxxxxxxxxxxxxxxxxxl2";
const LABEL_ID_3 = "clxxxxxxxxxxxxxxxxxxxxxxxxxl3";

// Mock session
const mockSession = {
  user: { id: USER_ID, email: "user@test.com", name: "Test User", role: "sdr" },
};

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
    lead: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    label: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import {
  addLabelToLead,
  removeLabelFromLead,
  getLeadLabels,
  setLeadLabels,
} from "@/actions/lead-labels";

describe("Lead Multi-Labels Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== ADD LABEL TO LEAD ====================
  describe("addLabelToLead", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(addLabelToLead(LEAD_ID, LABEL_ID_1)).rejects.toThrow("Não autorizado");
    });

    it("should throw error when lead not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null);

      await expect(addLabelToLead(LEAD_ID, LABEL_ID_1)).rejects.toThrow("Lead não encontrado");
    });

    it("should throw error when label not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue({ id: LEAD_ID, ownerId: USER_ID } as any);
      vi.mocked(prisma.label.findFirst).mockResolvedValue(null);

      await expect(addLabelToLead(LEAD_ID, LABEL_ID_1)).rejects.toThrow("Label não encontrada");
    });

    it("should add label to lead successfully", async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue({
        id: LEAD_ID,
        ownerId: USER_ID,
        labels: []
      } as any);
      vi.mocked(prisma.label.findFirst).mockResolvedValue({
        id: LABEL_ID_1,
        ownerId: USER_ID,
        name: "Saúde",
        color: "#ff0000"
      } as any);
      vi.mocked(prisma.lead.update).mockResolvedValue({
        id: LEAD_ID,
        labels: [{ id: LABEL_ID_1, name: "Saúde", color: "#ff0000" }]
      } as any);

      const result = await addLabelToLead(LEAD_ID, LABEL_ID_1);

      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: LEAD_ID },
        data: {
          labels: {
            connect: { id: LABEL_ID_1 },
          },
        },
        include: { labels: true },
      });
      expect(result.labels).toHaveLength(1);
    });

    it("should allow adding multiple labels to same lead", async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue({
        id: LEAD_ID,
        ownerId: USER_ID,
        labels: [{ id: LABEL_ID_1 }]
      } as any);
      vi.mocked(prisma.label.findFirst).mockResolvedValue({
        id: LABEL_ID_2,
        ownerId: USER_ID
      } as any);
      vi.mocked(prisma.lead.update).mockResolvedValue({
        id: LEAD_ID,
        labels: [
          { id: LABEL_ID_1, name: "Saúde", color: "#ff0000" },
          { id: LABEL_ID_2, name: "Curso", color: "#00ff00" }
        ]
      } as any);

      const result = await addLabelToLead(LEAD_ID, LABEL_ID_2);

      expect(result.labels).toHaveLength(2);
    });
  });

  // ==================== REMOVE LABEL FROM LEAD ====================
  describe("removeLabelFromLead", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(removeLabelFromLead(LEAD_ID, LABEL_ID_1)).rejects.toThrow("Não autorizado");
    });

    it("should throw error when lead not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null);

      await expect(removeLabelFromLead(LEAD_ID, LABEL_ID_1)).rejects.toThrow("Lead não encontrado");
    });

    it("should remove label from lead successfully", async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue({
        id: LEAD_ID,
        ownerId: USER_ID,
        labels: [{ id: LABEL_ID_1 }, { id: LABEL_ID_2 }]
      } as any);
      vi.mocked(prisma.lead.update).mockResolvedValue({
        id: LEAD_ID,
        labels: [{ id: LABEL_ID_2 }]
      } as any);

      const result = await removeLabelFromLead(LEAD_ID, LABEL_ID_1);

      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: LEAD_ID },
        data: {
          labels: {
            disconnect: { id: LABEL_ID_1 },
          },
        },
        include: { labels: true },
      });
      expect(result.labels).toHaveLength(1);
    });
  });

  // ==================== GET LEAD LABELS ====================
  describe("getLeadLabels", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(getLeadLabels(LEAD_ID)).rejects.toThrow("Não autorizado");
    });

    it("should throw error when lead not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null);

      await expect(getLeadLabels(LEAD_ID)).rejects.toThrow("Lead não encontrado");
    });

    it("should return empty array when lead has no labels", async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue({
        id: LEAD_ID,
        ownerId: USER_ID,
        labels: []
      } as any);

      const result = await getLeadLabels(LEAD_ID);

      expect(result).toEqual([]);
    });

    it("should return all labels for lead", async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);

      const mockLabels = [
        { id: LABEL_ID_1, name: "Saúde", color: "#ff0000" },
        { id: LABEL_ID_2, name: "Curso", color: "#00ff00" },
      ];

      vi.mocked(prisma.lead.findFirst).mockResolvedValue({
        id: LEAD_ID,
        ownerId: USER_ID,
        labels: mockLabels
      } as any);

      const result = await getLeadLabels(LEAD_ID);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Saúde");
      expect(result[1].name).toBe("Curso");
    });
  });

  // ==================== SET LEAD LABELS (REPLACE ALL) ====================
  describe("setLeadLabels", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(setLeadLabels(LEAD_ID, [LABEL_ID_1])).rejects.toThrow("Não autorizado");
    });

    it("should throw error when lead not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null);

      await expect(setLeadLabels(LEAD_ID, [LABEL_ID_1])).rejects.toThrow("Lead não encontrado");
    });

    it("should replace all labels with new set", async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue({
        id: LEAD_ID,
        ownerId: USER_ID,
        labels: [{ id: LABEL_ID_1 }]
      } as any);
      vi.mocked(prisma.label.findMany).mockResolvedValue([
        { id: LABEL_ID_2, ownerId: USER_ID },
        { id: LABEL_ID_3, ownerId: USER_ID },
      ] as any);
      vi.mocked(prisma.lead.update).mockResolvedValue({
        id: LEAD_ID,
        labels: [
          { id: LABEL_ID_2, name: "Curso", color: "#00ff00" },
          { id: LABEL_ID_3, name: "Tech", color: "#0000ff" }
        ]
      } as any);

      const result = await setLeadLabels(LEAD_ID, [LABEL_ID_2, LABEL_ID_3]);

      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: LEAD_ID },
        data: {
          labels: {
            set: [{ id: LABEL_ID_2 }, { id: LABEL_ID_3 }],
          },
        },
        include: { labels: true },
      });
      expect(result.labels).toHaveLength(2);
    });

    it("should remove all labels when empty array provided", async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue({
        id: LEAD_ID,
        ownerId: USER_ID,
        labels: [{ id: LABEL_ID_1 }, { id: LABEL_ID_2 }]
      } as any);
      vi.mocked(prisma.label.findMany).mockResolvedValue([] as any);
      vi.mocked(prisma.lead.update).mockResolvedValue({
        id: LEAD_ID,
        labels: []
      } as any);

      const result = await setLeadLabels(LEAD_ID, []);

      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: LEAD_ID },
        data: {
          labels: {
            set: [],
          },
        },
        include: { labels: true },
      });
      expect(result.labels).toHaveLength(0);
    });

    it("should only set labels owned by user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue({
        id: LEAD_ID,
        ownerId: USER_ID
      } as any);
      // Simulating that only LABEL_ID_1 belongs to user
      vi.mocked(prisma.label.findMany).mockResolvedValue([
        { id: LABEL_ID_1, ownerId: USER_ID },
      ] as any);
      vi.mocked(prisma.lead.update).mockResolvedValue({
        id: LEAD_ID,
        labels: [{ id: LABEL_ID_1 }]
      } as any);

      // Try to set labels including one that doesn't belong to user
      const result = await setLeadLabels(LEAD_ID, [LABEL_ID_1, "other-user-label"]);

      // Should only set the valid label
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: LEAD_ID },
        data: {
          labels: {
            set: [{ id: LABEL_ID_1 }],
          },
        },
        include: { labels: true },
      });
    });
  });

  // ==================== DATA ISOLATION ====================
  describe("Data Isolation", () => {
    it("should only allow operations on leads owned by user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);

      // Lead belongs to different user
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null);

      await expect(addLabelToLead(LEAD_ID, LABEL_ID_1)).rejects.toThrow("Lead não encontrado");

      expect(prisma.lead.findFirst).toHaveBeenCalledWith({
        where: {
          id: LEAD_ID,
          ownerId: USER_ID,
        },
        include: { labels: true },
      });
    });

    it("should only allow adding labels owned by user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue({
        id: LEAD_ID,
        ownerId: USER_ID
      } as any);
      // Label belongs to different user
      vi.mocked(prisma.label.findFirst).mockResolvedValue(null);

      await expect(addLabelToLead(LEAD_ID, LABEL_ID_1)).rejects.toThrow("Label não encontrada");

      expect(prisma.label.findFirst).toHaveBeenCalledWith({
        where: {
          id: LABEL_ID_1,
          ownerId: USER_ID,
        },
      });
    });
  });
});
