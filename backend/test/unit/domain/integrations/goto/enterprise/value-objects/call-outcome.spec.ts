import { describe, it, expect } from "vitest";
import { CallOutcome } from "@/domain/integrations/goto/enterprise/value-objects/call-outcome.vo";

describe("CallOutcome", () => {
  describe("OUTBOUND calls", () => {
    it("causeCode 16 + duration >= 15s → answered", () => {
      const result = CallOutcome.fromCauseCode(16, "OUTBOUND", 30);
      expect(result.isRight()).toBe(true);
      expect(result.unwrap().toString()).toBe("answered");
    });

    it("causeCode 16 + duration < 15s → voicemail", () => {
      const result = CallOutcome.fromCauseCode(16, "OUTBOUND", 10);
      expect(result.isRight()).toBe(true);
      expect(result.unwrap().toString()).toBe("voicemail");
    });

    it("causeCode 17 → busy", () => {
      const result = CallOutcome.fromCauseCode(17, "OUTBOUND", 0);
      expect(result.isRight()).toBe(true);
      expect(result.unwrap().toString()).toBe("busy");
    });

    it("causeCode 18 → no_answer", () => {
      const result = CallOutcome.fromCauseCode(18, "OUTBOUND", 0);
      expect(result.isRight()).toBe(true);
      expect(result.unwrap().toString()).toBe("no_answer");
    });

    it("causeCode 19 → no_answer", () => {
      const result = CallOutcome.fromCauseCode(19, "OUTBOUND", 0);
      expect(result.isRight()).toBe(true);
      expect(result.unwrap().toString()).toBe("no_answer");
    });

    it("causeCode 21 → rejected", () => {
      const result = CallOutcome.fromCauseCode(21, "OUTBOUND", 0);
      expect(result.isRight()).toBe(true);
      expect(result.unwrap().toString()).toBe("rejected");
    });

    it("causeCode 1 → invalid_number", () => {
      const result = CallOutcome.fromCauseCode(1, "OUTBOUND", 0);
      expect(result.isRight()).toBe(true);
      expect(result.unwrap().toString()).toBe("invalid_number");
    });

    it("unknown causeCode + duration > 0 → answered", () => {
      const result = CallOutcome.fromCauseCode(99, "OUTBOUND", 45);
      expect(result.isRight()).toBe(true);
      expect(result.unwrap().toString()).toBe("answered");
    });

    it("unknown causeCode + duration = 0 → unknown", () => {
      const result = CallOutcome.fromCauseCode(99, "OUTBOUND", 0);
      expect(result.isRight()).toBe(true);
      expect(result.unwrap().toString()).toBe("unknown");
    });
  });

  describe("INBOUND calls", () => {
    it("undefined causeCode + duration = 0 → missed", () => {
      const result = CallOutcome.fromCauseCode(undefined, "INBOUND", 0);
      expect(result.isRight()).toBe(true);
      expect(result.unwrap().toString()).toBe("missed");
    });

    it("undefined causeCode + duration > 0 → answered", () => {
      const result = CallOutcome.fromCauseCode(undefined, "INBOUND", 45);
      expect(result.isRight()).toBe(true);
      expect(result.unwrap().toString()).toBe("answered");
    });
  });

  describe("isAnswered", () => {
    it("answered call isAnswered = true", () => {
      const result = CallOutcome.fromCauseCode(16, "OUTBOUND", 30);
      expect(result.unwrap().isAnswered).toBe(true);
    });

    it("voicemail isAnswered = false", () => {
      const result = CallOutcome.fromCauseCode(16, "OUTBOUND", 10);
      expect(result.unwrap().isAnswered).toBe(false);
    });
  });

  describe("fromCallHistory — OUTBOUND respondidas", () => {
    it("answerTime presente + duração >= 15s → answered", () => {
      const result = CallOutcome.fromCallHistory(16, "OUTBOUND", 30_000, "2024-01-01T10:00:30Z");
      expect(result.unwrap().toString()).toBe("answered");
    });

    it("answerTime presente + duração < 15s → voicemail (ligação breve)", () => {
      const result = CallOutcome.fromCallHistory(16, "OUTBOUND", 10_000, "2024-01-01T10:00:10Z");
      expect(result.unwrap().toString()).toBe("voicemail");
    });
  });

  describe("fromCallHistory — OUTBOUND não respondidas", () => {
    it("answerTime ausente + hangupCause 17 → busy", () => {
      const result = CallOutcome.fromCallHistory(17, "OUTBOUND", 0, undefined);
      expect(result.unwrap().toString()).toBe("busy");
    });

    it("answerTime ausente + hangupCause 18 → no_answer", () => {
      const result = CallOutcome.fromCallHistory(18, "OUTBOUND", 0, undefined);
      expect(result.unwrap().toString()).toBe("no_answer");
    });

    it("answerTime ausente + hangupCause 19 → no_answer", () => {
      const result = CallOutcome.fromCallHistory(19, "OUTBOUND", 0, undefined);
      expect(result.unwrap().toString()).toBe("no_answer");
    });

    it("answerTime ausente + hangupCause 21 → rejected", () => {
      const result = CallOutcome.fromCallHistory(21, "OUTBOUND", 0, undefined);
      expect(result.unwrap().toString()).toBe("rejected");
    });

    it("answerTime ausente + hangupCause 1 → invalid_number", () => {
      const result = CallOutcome.fromCallHistory(1, "OUTBOUND", 0, undefined);
      expect(result.unwrap().toString()).toBe("invalid_number");
    });

    it("answerTime ausente + hangupCause 16 (sem atendimento) → unknown", () => {
      const result = CallOutcome.fromCallHistory(16, "OUTBOUND", 0, undefined);
      expect(result.unwrap().toString()).toBe("unknown");
    });

    it("answerTime ausente + hangupCause undefined → unknown", () => {
      const result = CallOutcome.fromCallHistory(undefined, "OUTBOUND", 0, undefined);
      expect(result.unwrap().toString()).toBe("unknown");
    });
  });

  describe("fromCallHistory — INBOUND", () => {
    it("answerTime presente → answered", () => {
      const result = CallOutcome.fromCallHistory(0, "INBOUND", 30_000, "2024-01-01T10:00:30Z");
      expect(result.unwrap().toString()).toBe("answered");
    });

    it("answerTime ausente → missed", () => {
      const result = CallOutcome.fromCallHistory(19, "INBOUND", 0, undefined);
      expect(result.unwrap().toString()).toBe("missed");
    });
  });
});
