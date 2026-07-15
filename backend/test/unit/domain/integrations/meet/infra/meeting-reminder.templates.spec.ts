import { describe, it, expect } from "vitest";
import {
  buildReminderEmail,
  type ReminderEmailParams,
} from "@/domain/integrations/meet/infra/email-templates/meeting-reminder.templates";

// Meetings booked via self-scheduling get a title like "Reunião: <name>".
// The reminder copy must not double the word ("Sua reunião Reunião: ...").
const withPrefix: ReminderEmailParams = {
  organizerEmail: "bruno@wbdigitalsolutions.com",
  meetingTitle: "Reunião: Fabio Ragonha",
  meetingStartAt: new Date("2026-07-13T17:30:00Z"),
  meetingEndAt: new Date("2026-07-13T18:00:00Z"),
  meetLink: "https://meet.google.com/ztx-yptn-tds",
  contactName: "Fabio Ragonha",
};

describe("meeting reminder templates — no doubled 'Reunião' prefix", () => {
  for (const type of ["morning_reminder", "one_hour_reminder", "on_time_reminder"] as const) {
    it(`${type}: subject and html don't double 'Reunião:'`, () => {
      const { subject, html } = buildReminderEmail(type, withPrefix);
      // No "Reunião ... Reunião:" or "Lembrete: Reunião:" doubling
      expect(subject.toLowerCase()).not.toContain("reunião: reunião");
      expect(subject.toLowerCase()).not.toContain("lembrete: reunião:");
      expect(html.toLowerCase()).not.toContain("sua reunião reunião:");
      expect(html.toLowerCase()).not.toContain("reunião <strong>reunião:");
      // Still identifies the person
      expect(html).toContain("Fabio Ragonha");
    });
  }

  it("keeps a non-'Reunião' title intact (only strips the redundant prefix)", () => {
    const topic: ReminderEmailParams = { ...withPrefix, meetingTitle: "Demo do produto" };
    const { subject, html } = buildReminderEmail("morning_reminder", topic);
    expect(subject).toContain("Demo do produto");
    expect(html).toContain("Demo do produto");
  });
});
