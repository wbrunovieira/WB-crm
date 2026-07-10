import { describe, it, expect } from "vitest";
import { computeLastContactAt } from "@/infra/shared/timeline/last-contact";

const d = (iso: string) => new Date(iso);
const NOW = d("2026-07-31T00:00:00Z"); // fixed "now" so fixtures are deterministic

describe("computeLastContactAt", () => {
  it("returns null when there are no activities", () => {
    expect(computeLastContactAt([], NOW)).toBeNull();
  });

  it("ignores non-contact activities (task)", () => {
    expect(
      computeLastContactAt([{ type: "task", createdAt: d("2026-07-01T00:00:00Z") }], NOW),
    ).toBeNull();
  });

  it("returns the most recent contact activity date", () => {
    const out = computeLastContactAt(
      [
        { type: "call", completedAt: d("2026-07-03T00:00:00Z"), createdAt: d("2026-07-03T00:00:00Z") },
        { type: "email", completedAt: d("2026-07-05T00:00:00Z"), createdAt: d("2026-07-05T00:00:00Z") },
        { type: "task", completedAt: d("2026-07-09T00:00:00Z"), createdAt: d("2026-07-09T00:00:00Z") },
      ],
      NOW,
    );
    expect(out?.toISOString()).toBe("2026-07-05T00:00:00.000Z");
  });

  it("prefers completedAt, then dueDate, then createdAt", () => {
    const out = computeLastContactAt(
      [{ type: "whatsapp", completedAt: null, dueDate: d("2026-07-08T00:00:00Z"), createdAt: d("2026-07-01T00:00:00Z") }],
      NOW,
    );
    expect(out?.toISOString()).toBe("2026-07-08T00:00:00.000Z");
  });

  it("counts all contact types (call/meeting/email/whatsapp/physical_visit/instagram_dm)", () => {
    const out = computeLastContactAt(
      [
        { type: "instagram_dm", completedAt: d("2026-07-02T00:00:00Z"), createdAt: d("2026-07-02T00:00:00Z") },
        { type: "physical_visit", completedAt: d("2026-07-06T00:00:00Z"), createdAt: d("2026-07-06T00:00:00Z") },
      ],
      NOW,
    );
    expect(out?.toISOString()).toBe("2026-07-06T00:00:00.000Z");
  });

  it("ignores future-dated activities (a scheduled meeting is not a past contact)", () => {
    const out = computeLastContactAt(
      [
        { type: "call", completedAt: d("2026-07-04T00:00:00Z"), createdAt: d("2026-07-04T00:00:00Z") },
        // scheduled for the future, not completed → must NOT count as "last contact"
        { type: "meeting", completedAt: null, dueDate: d("2026-08-10T00:00:00Z"), createdAt: d("2026-07-20T00:00:00Z") },
      ],
      NOW,
    );
    expect(out?.toISOString()).toBe("2026-07-04T00:00:00.000Z");
  });
});
