import { describe, it, expect } from "vitest";
import { computeProgressStats, formatDuration } from "@/lib/email-campaigns/progress-stats";

type R = { status: string; stepsSent: number[]; lastSentAt?: string };

describe("computeProgressStats — delivered excludes bounces", () => {
  it("does NOT count a sent-then-bounced recipient as delivered", () => {
    const recipients: R[] = [
      { status: "COMPLETED", stepsSent: [0], lastSentAt: "2026-06-23T18:00:00Z" },
      // sent (has a send record) but later bounced → must be excluded from delivered
      { status: "BOUNCED", stepsSent: [0], lastSentAt: "2026-06-23T18:00:10Z" },
      // bounced before any send (no record)
      { status: "BOUNCED", stepsSent: [] },
      { status: "PENDING", stepsSent: [] },
    ];
    const s = computeProgressStats(recipients);
    expect(s.delivered).toBe(1);
    expect(s.bounced).toBe(2);
    expect(s.pending).toBe(1);
  });
});

describe("computeProgressStats — ETA", () => {
  it("estimates remaining time from the average interval between sends", () => {
    // 3 sends, 10s apart → avg interval 10s; 2 pending → ETA ~20s
    const recipients: R[] = [
      { status: "COMPLETED", stepsSent: [0], lastSentAt: "2026-06-23T18:00:00Z" },
      { status: "COMPLETED", stepsSent: [0], lastSentAt: "2026-06-23T18:00:10Z" },
      { status: "COMPLETED", stepsSent: [0], lastSentAt: "2026-06-23T18:00:20Z" },
      { status: "PENDING", stepsSent: [] },
      { status: "PENDING", stepsSent: [] },
    ];
    const s = computeProgressStats(recipients);
    expect(s.avgIntervalMs).toBe(10_000);
    expect(s.etaMs).toBe(20_000);
  });

  it("returns null ETA when nothing is pending", () => {
    const recipients: R[] = [
      { status: "COMPLETED", stepsSent: [0], lastSentAt: "2026-06-23T18:00:00Z" },
      { status: "COMPLETED", stepsSent: [0], lastSentAt: "2026-06-23T18:00:10Z" },
    ];
    expect(computeProgressStats(recipients).etaMs).toBeNull();
  });

  it("returns null ETA when fewer than 2 sends exist", () => {
    const recipients: R[] = [
      { status: "ACTIVE", stepsSent: [0], lastSentAt: "2026-06-23T18:00:00Z" },
      { status: "PENDING", stepsSent: [] },
    ];
    expect(computeProgressStats(recipients).etaMs).toBeNull();
  });
});

describe("formatDuration", () => {
  it("formats sub-minute, minutes and hours", () => {
    expect(formatDuration(30_000)).toBe("menos de 1 min");
    expect(formatDuration(5 * 60_000)).toBe("5 min");
    expect(formatDuration((2 * 60 + 15) * 60_000)).toBe("2h 15min");
  });
});
