import { describe, it, expect, beforeEach } from "vitest";
import { right } from "@/core/either";
import { EmailController } from "@/domain/integrations/email/infra/controllers/email.controller";
import type { ScheduleEmailInput } from "@/domain/integrations/email/application/use-cases/schedule-email.use-case";

let captured: ScheduleEmailInput;
let controller: EmailController;

beforeEach(() => {
  captured = {} as ScheduleEmailInput;
  const scheduleEmail = {
    execute: async (input: ScheduleEmailInput) => {
      captured = input;
      return right({ scheduledEmailId: "s1", activityId: "a1", scheduledSendAt: input.scheduledSendAt });
    },
  };
  controller = new EmailController(
    null as never, // sendEmail
    scheduleEmail as never,
    null as never, // cancelScheduledEmail
    null as never, // listScheduledEmails
    null as never, null as never, null as never, null as never, null as never,
    null as never, null as never, null as never, null as never, null as never,
    null as never, null as never, null as never,
  );
});

const user = { id: "u1", role: "sdr" } as never;
const base = { to: "x@example.com", subject: "Oi", bodyHtml: "<p>oi</p>" };

describe("EmailController.schedule — timezone of scheduledSendAt", () => {
  it("interprets a naive scheduledSendAt as São Paulo (UTC-3)", async () => {
    await controller.schedule({ ...base, scheduledSendAt: "2026-06-30T16:00:00" } as never, user);
    // 16:00 São Paulo = 19:00 UTC (sends at 16:00 local, not 13:00)
    expect(captured.scheduledSendAt.toISOString()).toBe("2026-06-30T19:00:00.000Z");
  });

  it("keeps an explicit-Z scheduledSendAt absolute (UI path unchanged)", async () => {
    await controller.schedule({ ...base, scheduledSendAt: "2026-06-30T19:00:00.000Z" } as never, user);
    expect(captured.scheduledSendAt.toISOString()).toBe("2026-06-30T19:00:00.000Z");
  });

  it("rejects an invalid scheduledSendAt", async () => {
    await expect(
      controller.schedule({ ...base, scheduledSendAt: "not-a-date" } as never, user),
    ).rejects.toThrow();
  });
});
