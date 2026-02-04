/**
 * ICP Link Fields Validation Tests
 *
 * Tests for LeadICP and OrganizationICP extended fields
 * Following TDD: Write tests first, then implement
 */

import { describe, it, expect } from "vitest";
import {
  leadICPExtendedSchema,
  organizationICPExtendedSchema,
  icpFitStatusEnum,
  realDecisionMakerEnum,
  businessMomentEnum,
  currentPlatformEnum,
  mainDeclaredPainEnum,
  strategicDesireEnum,
  nonClosingReasonEnum,
  estimatedDecisionTimeEnum,
} from "@/lib/validations/icp";

// ============ ENUMS TESTS ============

describe("ICP Link Enums", () => {
  describe("icpFitStatusEnum", () => {
    it("should accept valid values", () => {
      expect(() => icpFitStatusEnum.parse("ideal")).not.toThrow();
      expect(() => icpFitStatusEnum.parse("partial")).not.toThrow();
      expect(() => icpFitStatusEnum.parse("out_of_icp")).not.toThrow();
    });

    it("should reject invalid values", () => {
      expect(() => icpFitStatusEnum.parse("invalid")).toThrow();
      expect(() => icpFitStatusEnum.parse("")).toThrow();
    });
  });

  describe("realDecisionMakerEnum", () => {
    it("should accept valid values", () => {
      expect(() => realDecisionMakerEnum.parse("founder_ceo")).not.toThrow();
      expect(() => realDecisionMakerEnum.parse("tech_partner")).not.toThrow();
      expect(() => realDecisionMakerEnum.parse("commercial_partner")).not.toThrow();
      expect(() => realDecisionMakerEnum.parse("other")).not.toThrow();
    });
  });

  describe("businessMomentEnum", () => {
    it("should accept valid values", () => {
      expect(() => businessMomentEnum.parse("validation")).not.toThrow();
      expect(() => businessMomentEnum.parse("growth")).not.toThrow();
      expect(() => businessMomentEnum.parse("scale")).not.toThrow();
      expect(() => businessMomentEnum.parse("consolidation")).not.toThrow();
    });
  });

  describe("currentPlatformEnum", () => {
    it("should accept valid values", () => {
      expect(() => currentPlatformEnum.parse("hotmart")).not.toThrow();
      expect(() => currentPlatformEnum.parse("cademi")).not.toThrow();
      expect(() => currentPlatformEnum.parse("moodle")).not.toThrow();
      expect(() => currentPlatformEnum.parse("own_lms")).not.toThrow();
      expect(() => currentPlatformEnum.parse("scattered_tools")).not.toThrow();
      expect(() => currentPlatformEnum.parse("other")).not.toThrow();
    });
  });

  describe("mainDeclaredPainEnum", () => {
    it("should accept valid values", () => {
      expect(() => mainDeclaredPainEnum.parse("student_experience")).not.toThrow();
      expect(() => mainDeclaredPainEnum.parse("operational_fragmentation")).not.toThrow();
      expect(() => mainDeclaredPainEnum.parse("lack_of_identity")).not.toThrow();
      expect(() => mainDeclaredPainEnum.parse("growth_limitation")).not.toThrow();
      expect(() => mainDeclaredPainEnum.parse("founder_emotional_pain")).not.toThrow();
    });
  });

  describe("strategicDesireEnum", () => {
    it("should accept valid values", () => {
      expect(() => strategicDesireEnum.parse("total_control")).not.toThrow();
      expect(() => strategicDesireEnum.parse("own_identity")).not.toThrow();
      expect(() => strategicDesireEnum.parse("scale_without_chaos")).not.toThrow();
      expect(() => strategicDesireEnum.parse("unify_operation")).not.toThrow();
      expect(() => strategicDesireEnum.parse("market_differentiation")).not.toThrow();
    });
  });

  describe("nonClosingReasonEnum", () => {
    it("should accept valid values", () => {
      expect(() => nonClosingReasonEnum.parse("priority_changed")).not.toThrow();
      expect(() => nonClosingReasonEnum.parse("budget")).not.toThrow();
      expect(() => nonClosingReasonEnum.parse("timing")).not.toThrow();
      expect(() => nonClosingReasonEnum.parse("internal_decision")).not.toThrow();
      expect(() => nonClosingReasonEnum.parse("not_icp")).not.toThrow();
      expect(() => nonClosingReasonEnum.parse("other")).not.toThrow();
    });
  });

  describe("estimatedDecisionTimeEnum", () => {
    it("should accept valid values", () => {
      expect(() => estimatedDecisionTimeEnum.parse("less_than_2_weeks")).not.toThrow();
      expect(() => estimatedDecisionTimeEnum.parse("2_to_4_weeks")).not.toThrow();
      expect(() => estimatedDecisionTimeEnum.parse("1_to_2_months")).not.toThrow();
      expect(() => estimatedDecisionTimeEnum.parse("3_plus_months")).not.toThrow();
    });
  });
});

// ============ EXTENDED LEAD ICP SCHEMA TESTS ============

describe("leadICPExtendedSchema", () => {
  const validBase = {
    leadId: "lead-123",
    icpId: "icp-456",
  };

  describe("required fields", () => {
    it("should require leadId and icpId", () => {
      expect(() => leadICPExtendedSchema.parse(validBase)).not.toThrow();
    });

    it("should reject missing leadId", () => {
      expect(() => leadICPExtendedSchema.parse({ icpId: "icp-456" })).toThrow();
    });

    it("should reject missing icpId", () => {
      expect(() => leadICPExtendedSchema.parse({ leadId: "lead-123" })).toThrow();
    });
  });

  describe("essential fields", () => {
    it("should accept icpFitStatus", () => {
      const result = leadICPExtendedSchema.parse({
        ...validBase,
        icpFitStatus: "ideal",
      });
      expect(result.icpFitStatus).toBe("ideal");
    });

    it("should accept realDecisionMaker with other text", () => {
      const result = leadICPExtendedSchema.parse({
        ...validBase,
        realDecisionMaker: "other",
        realDecisionMakerOther: "CTO",
      });
      expect(result.realDecisionMaker).toBe("other");
      expect(result.realDecisionMakerOther).toBe("CTO");
    });

    it("should accept perceivedUrgency as array", () => {
      const result = leadICPExtendedSchema.parse({
        ...validBase,
        perceivedUrgency: ["curiosity", "interest"],
      });
      expect(result.perceivedUrgency).toEqual(["curiosity", "interest"]);
    });

    it("should accept single perceivedUrgency value in array", () => {
      const result = leadICPExtendedSchema.parse({
        ...validBase,
        perceivedUrgency: ["active_pain"],
      });
      expect(result.perceivedUrgency).toEqual(["active_pain"]);
    });

    it("should accept businessMoment as array", () => {
      const result = leadICPExtendedSchema.parse({
        ...validBase,
        businessMoment: ["growth", "scale"],
      });
      expect(result.businessMoment).toEqual(["growth", "scale"]);
    });
  });

  describe("specific fields", () => {
    it("should accept currentPlatforms as array", () => {
      const result = leadICPExtendedSchema.parse({
        ...validBase,
        currentPlatforms: ["hotmart", "moodle"],
      });
      expect(result.currentPlatforms).toEqual(["hotmart", "moodle"]);
    });

    it("should accept fragmentationLevel 0-10", () => {
      expect(() => leadICPExtendedSchema.parse({ ...validBase, fragmentationLevel: 0 })).not.toThrow();
      expect(() => leadICPExtendedSchema.parse({ ...validBase, fragmentationLevel: 10 })).not.toThrow();
    });

    it("should reject fragmentationLevel outside 0-10", () => {
      expect(() => leadICPExtendedSchema.parse({ ...validBase, fragmentationLevel: -1 })).toThrow();
      expect(() => leadICPExtendedSchema.parse({ ...validBase, fragmentationLevel: 11 })).toThrow();
    });

    it("should accept mainDeclaredPain", () => {
      const result = leadICPExtendedSchema.parse({
        ...validBase,
        mainDeclaredPain: "operational_fragmentation",
      });
      expect(result.mainDeclaredPain).toBe("operational_fragmentation");
    });

    it("should accept strategicDesire", () => {
      const result = leadICPExtendedSchema.parse({
        ...validBase,
        strategicDesire: "scale_without_chaos",
      });
      expect(result.strategicDesire).toBe("scale_without_chaos");
    });

    it("should accept perceivedTechnicalComplexity 1-5", () => {
      expect(() => leadICPExtendedSchema.parse({ ...validBase, perceivedTechnicalComplexity: 1 })).not.toThrow();
      expect(() => leadICPExtendedSchema.parse({ ...validBase, perceivedTechnicalComplexity: 5 })).not.toThrow();
    });
  });

  describe("strategic fields", () => {
    it("should accept purchaseTrigger as text", () => {
      const result = leadICPExtendedSchema.parse({
        ...validBase,
        purchaseTrigger: "Crescimento rápido de alunos",
      });
      expect(result.purchaseTrigger).toBe("Crescimento rápido de alunos");
    });

    it("should limit purchaseTrigger to 500 chars", () => {
      expect(() => leadICPExtendedSchema.parse({
        ...validBase,
        purchaseTrigger: "a".repeat(501),
      })).toThrow();
    });

    it("should accept nonClosingReason", () => {
      const result = leadICPExtendedSchema.parse({
        ...validBase,
        nonClosingReason: "budget",
      });
      expect(result.nonClosingReason).toBe("budget");
    });

    it("should accept estimatedDecisionTime", () => {
      const result = leadICPExtendedSchema.parse({
        ...validBase,
        estimatedDecisionTime: "2_to_4_weeks",
      });
      expect(result.estimatedDecisionTime).toBe("2_to_4_weeks");
    });

    it("should accept expansionPotential 1-5", () => {
      expect(() => leadICPExtendedSchema.parse({ ...validBase, expansionPotential: 1 })).not.toThrow();
      expect(() => leadICPExtendedSchema.parse({ ...validBase, expansionPotential: 5 })).not.toThrow();
    });

    it("should reject expansionPotential outside 1-5", () => {
      expect(() => leadICPExtendedSchema.parse({ ...validBase, expansionPotential: 0 })).toThrow();
      expect(() => leadICPExtendedSchema.parse({ ...validBase, expansionPotential: 6 })).toThrow();
    });
  });

  describe("all fields optional except leadId and icpId", () => {
    it("should accept all fields together", () => {
      const fullData = {
        ...validBase,
        matchScore: 85,
        notes: "Great fit",
        // Essential
        icpFitStatus: "ideal",
        realDecisionMaker: "founder_ceo",
        perceivedUrgency: ["current_need", "active_pain"],
        businessMoment: ["growth", "scale"],
        // Specific
        currentPlatforms: ["hotmart", "cademi"],
        fragmentationLevel: 7,
        mainDeclaredPain: "operational_fragmentation",
        strategicDesire: "unify_operation",
        perceivedTechnicalComplexity: 3,
        // Strategic
        purchaseTrigger: "Limite da plataforma atual",
        nonClosingReason: null,
        estimatedDecisionTime: "1_to_2_months",
        expansionPotential: 4,
      };

      const result = leadICPExtendedSchema.parse(fullData);
      expect(result.icpFitStatus).toBe("ideal");
      expect(result.currentPlatforms).toEqual(["hotmart", "cademi"]);
      expect(result.fragmentationLevel).toBe(7);
    });
  });
});

// ============ EXTENDED ORGANIZATION ICP SCHEMA TESTS ============

describe("organizationICPExtendedSchema", () => {
  const validBase = {
    organizationId: "org-123",
    icpId: "icp-456",
  };

  it("should require organizationId and icpId", () => {
    expect(() => organizationICPExtendedSchema.parse(validBase)).not.toThrow();
  });

  it("should accept all extended fields same as leadICPExtendedSchema", () => {
    const fullData = {
      ...validBase,
      matchScore: 90,
      icpFitStatus: "ideal",
      realDecisionMaker: "tech_partner",
      perceivedUrgency: ["active_pain"],
      businessMoment: ["scale"],
      currentPlatforms: ["own_lms"],
      fragmentationLevel: 3,
      mainDeclaredPain: "growth_limitation",
      strategicDesire: "total_control",
      perceivedTechnicalComplexity: 4,
      purchaseTrigger: "Reclamação de alunos",
      estimatedDecisionTime: "less_than_2_weeks",
      expansionPotential: 5,
    };

    const result = organizationICPExtendedSchema.parse(fullData);
    expect(result.icpFitStatus).toBe("ideal");
    expect(result.expansionPotential).toBe(5);
  });
});
