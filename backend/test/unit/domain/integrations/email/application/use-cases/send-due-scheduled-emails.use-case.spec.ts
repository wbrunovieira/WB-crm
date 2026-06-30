import { describe, it, expect, beforeEach } from "vitest";
import { SendDueScheduledEmailsUseCase } from "@/domain/integrations/email/application/use-cases/send-due-scheduled-emails.use-case";
import { SendEmailUseCase } from "@/domain/integrations/email/application/use-cases/send-email.use-case";
import { ScheduleEmailUseCase } from "@/domain/integrations/email/application/use-cases/schedule-email.use-case";
import { InMemoryScheduledEmailSendsRepository } from "../../fakes/in-memory-scheduled-email-sends.repository";
import { FakeGmailPort } from "../../fakes/fake-gmail.port";
import { FakeGoogleOAuthPort } from "../../fakes/fake-google-oauth.port";
import { FakeEmailMessagesRepository } from "../../fakes/fake-email-messages.repository";
import { FakeEmailTrackingRepository } from "../../fakes/fake-email-tracking.repository";
import { CreateActivityUseCase } from "@/domain/activities/application/use-cases/create-activity.use-case";
import { FakeActivitiesRepository } from "@test/unit/domain/integrations/whatsapp/fakes/fake-activities.repository";

const OWNER_ID = "owner-001";
const NOW = new Date("2026-06-30T12:00:00.000Z");
const DUE_AT = new Date("2026-06-30T11:00:00.000Z"); // already past at NOW
const FUTURE = new Date("2026-07-05T09:00:00.000Z");

let scheduledRepo: InMemoryScheduledEmailSendsRepository;
let activitiesRepo: FakeActivitiesRepository;
let createActivity: CreateActivityUseCase;
let gmailPort: FakeGmailPort;
let oauthPort: FakeGoogleOAuthPort;
let emailMessagesRepo: FakeEmailMessagesRepository;
let emailTrackingRepo: FakeEmailTrackingRepository;
let sendEmail: SendEmailUseCase;
let scheduleEmail: ScheduleEmailUseCase;
let worker: SendDueScheduledEmailsUseCase;

beforeEach(() => {
  scheduledRepo = new InMemoryScheduledEmailSendsRepository();
  activitiesRepo = new FakeActivitiesRepository();
  createActivity = new CreateActivityUseCase(activitiesRepo);
  gmailPort = new FakeGmailPort();
  oauthPort = new FakeGoogleOAuthPort();
  emailMessagesRepo = new FakeEmailMessagesRepository();
  emailTrackingRepo = new FakeEmailTrackingRepository();
  sendEmail = new SendEmailUseCase(gmailPort, oauthPort, emailMessagesRepo, emailTrackingRepo, createActivity, activitiesRepo);
  scheduleEmail = new ScheduleEmailUseCase(scheduledRepo, createActivity);
  worker = new SendDueScheduledEmailsUseCase(scheduledRepo, sendEmail, activitiesRepo);
});

// Schedules an email whose scheduledSendAt is in the future, then rewinds it to
// `sendAt` so it is "due" at NOW without tripping the future-date validation.
async function scheduleDue(sendAt: Date, overrides: Record<string, unknown> = {}) {
  const result = await scheduleEmail.execute(
    {
      ownerId: OWNER_ID,
      to: "recipient@example.com",
      subject: "Proposta",
      bodyHtml: "<p>Olá</p>",
      scheduledSendAt: FUTURE,
      leadId: "lead-1",
      ...overrides,
    },
    NOW,
  );
  const id = (result.value as { scheduledEmailId: string }).scheduledEmailId;
  const record = await scheduledRepo.findById(id)!;
  // rewind to the desired (possibly past) time
  (record as unknown as { props: { scheduledSendAt: Date } }).props.scheduledSendAt = sendAt;
  await scheduledRepo.save(record!);
  return record!;
}

describe("SendDueScheduledEmailsUseCase", () => {
  it("sends due emails and marks them SENT", async () => {
    const record = await scheduleDue(DUE_AT);

    const result = await worker.execute(NOW);

    expect(result.isRight()).toBe(true);
    expect(result.unwrap()).toEqual({ sent: 1, failed: 0 });
    expect(gmailPort.sentMessages).toHaveLength(1);
    expect(gmailPort.sentMessages[0].to).toBe("recipient@example.com");

    const saved = await scheduledRepo.findById(record.id.toString());
    expect(saved!.status).toBe("SENT");
    expect(saved!.sentMessageId).toBeTruthy();
    expect(saved!.sentAt).toEqual(NOW);
  });

  it("completes the linked pending activity instead of creating a new one", async () => {
    const record = await scheduleDue(DUE_AT);
    expect(activitiesRepo.items).toHaveLength(1); // created pending at schedule time
    const activityId = record.activityId!;

    await worker.execute(NOW);

    expect(activitiesRepo.items).toHaveLength(1); // still one — completed in place
    const activity = await activitiesRepo.findByIdRaw(activityId);
    expect(activity!.completed).toBe(true);
    expect(activity!.scheduledSendAt).toBeUndefined();
    expect(activity!.emailMessageId).toBeTruthy();
  });

  it("does not send emails that are not yet due", async () => {
    await scheduleDue(new Date("2026-06-30T18:00:00.000Z")); // later today, after NOW

    const result = await worker.execute(NOW);

    expect(result.unwrap()).toEqual({ sent: 0, failed: 0 });
    expect(gmailPort.sentMessages).toHaveLength(0);
  });

  it("marks the record FAILED and fails the activity when the send fails", async () => {
    const record = await scheduleDue(DUE_AT);
    const activityId = record.activityId!;
    gmailPort.shouldFailSend = true;

    const result = await worker.execute(NOW);

    expect(result.unwrap()).toEqual({ sent: 0, failed: 1 });
    const saved = await scheduledRepo.findById(record.id.toString());
    expect(saved!.status).toBe("FAILED");
    expect(saved!.failReason).toContain("Gmail send failed");

    const activity = await activitiesRepo.findByIdRaw(activityId);
    expect(activity!.failedAt).toBeDefined();
    expect(activity!.scheduledSendAt).toBeUndefined();
  });

  it("does not re-send an already SENT record", async () => {
    const record = await scheduleDue(DUE_AT);
    record.markSent("msg-x", "thread-x", NOW);
    await scheduledRepo.save(record);

    const result = await worker.execute(NOW);

    expect(result.unwrap()).toEqual({ sent: 0, failed: 0 });
    expect(gmailPort.sentMessages).toHaveLength(0);
  });

  it("processes multiple due records in one run", async () => {
    await scheduleDue(DUE_AT, { to: "a@example.com" });
    await scheduleDue(DUE_AT, { to: "b@example.com" });

    const result = await worker.execute(NOW);

    expect(result.unwrap()).toEqual({ sent: 2, failed: 0 });
    expect(gmailPort.sentMessages).toHaveLength(2);
  });
});
