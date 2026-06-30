import { describe, it, expect, beforeEach } from "vitest";
import { SendScheduledEmailNowUseCase } from "@/domain/integrations/email/application/use-cases/send-scheduled-email-now.use-case";
import { SendEmailUseCase } from "@/domain/integrations/email/application/use-cases/send-email.use-case";
import { InMemoryScheduledEmailSendsRepository } from "../../fakes/in-memory-scheduled-email-sends.repository";
import { ScheduledEmailSend } from "@/domain/integrations/email/enterprise/entities/scheduled-email-send";
import { FakeGmailPort } from "../../fakes/fake-gmail.port";
import { FakeGoogleOAuthPort } from "../../fakes/fake-google-oauth.port";
import { FakeEmailMessagesRepository } from "../../fakes/fake-email-messages.repository";
import { FakeEmailTrackingRepository } from "../../fakes/fake-email-tracking.repository";
import { CreateActivityUseCase } from "@/domain/activities/application/use-cases/create-activity.use-case";
import { FakeActivitiesRepository } from "@test/unit/domain/integrations/whatsapp/fakes/fake-activities.repository";

const OWNER = "owner-1";

let scheduledRepo: InMemoryScheduledEmailSendsRepository;
let activitiesRepo: FakeActivitiesRepository;
let createActivity: CreateActivityUseCase;
let gmailPort: FakeGmailPort;
let sendEmail: SendEmailUseCase;
let useCase: SendScheduledEmailNowUseCase;

function makePending(activityId: string, ownerId = OWNER) {
  return ScheduledEmailSend.create({
    ownerId,
    activityId,
    scheduledSendAt: new Date("2026-08-01T09:00:00Z"), // future — "send now" ignores it
    to: "recipient@example.com",
    subject: "Proposta",
    bodyHtml: "<p>Olá</p>",
    fromEmail: null,
    threadId: null,
    attachments: [],
    leadId: "lead-1",
    contactId: null,
    contactIds: [],
    organizationId: null,
    dealId: null,
  });
}

function addPendingActivity() {
  return activitiesRepo.createAndAdd({
    ownerId: OWNER,
    type: "email",
    subject: "Proposta",
    completed: false,
    scheduledSendAt: new Date("2026-08-01T09:00:00Z"),
    meetingNoShow: false,
    emailReplied: false,
    emailOpenCount: 0,
    emailLinkClickCount: 0,
  });
}

beforeEach(() => {
  scheduledRepo = new InMemoryScheduledEmailSendsRepository();
  activitiesRepo = new FakeActivitiesRepository();
  createActivity = new CreateActivityUseCase(activitiesRepo);
  gmailPort = new FakeGmailPort();
  sendEmail = new SendEmailUseCase(
    gmailPort,
    new FakeGoogleOAuthPort(),
    new FakeEmailMessagesRepository(),
    new FakeEmailTrackingRepository(),
    createActivity,
    activitiesRepo,
  );
  useCase = new SendScheduledEmailNowUseCase(scheduledRepo, sendEmail, activitiesRepo);
});

describe("SendScheduledEmailNowUseCase", () => {
  it("sends a pending scheduled email immediately and marks it SENT", async () => {
    const activity = addPendingActivity();
    const record = makePending(activity.id.toString());
    await scheduledRepo.save(record);

    const result = await useCase.execute({ activityId: activity.id.toString(), requesterId: OWNER, requesterRole: "sdr" });

    expect(result.isRight()).toBe(true);
    expect(gmailPort.sentMessages).toHaveLength(1);
    const saved = await scheduledRepo.findById(record.id.toString());
    expect(saved!.status).toBe("SENT");
    expect(saved!.sentMessageId).toBeTruthy();
  });

  it("completes the linked pending activity in place", async () => {
    const activity = addPendingActivity();
    await scheduledRepo.save(makePending(activity.id.toString()));

    await useCase.execute({ activityId: activity.id.toString(), requesterId: OWNER, requesterRole: "sdr" });

    expect(activitiesRepo.items).toHaveLength(1);
    const updated = await activitiesRepo.findByIdRaw(activity.id.toString());
    expect(updated!.completed).toBe(true);
    expect(updated!.scheduledSendAt).toBeUndefined();
  });

  it("returns left when no scheduled send exists for the activity", async () => {
    const result = await useCase.execute({ activityId: "missing", requesterId: OWNER, requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
  });

  it("returns left when requester is neither owner nor admin", async () => {
    const activity = addPendingActivity();
    await scheduledRepo.save(makePending(activity.id.toString(), "someone-else"));
    const result = await useCase.execute({ activityId: activity.id.toString(), requesterId: OWNER, requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("Não autorizado");
  });

  it("allows an admin to send another owner's scheduled email", async () => {
    const activity = addPendingActivity();
    await scheduledRepo.save(makePending(activity.id.toString(), "someone-else"));
    const result = await useCase.execute({ activityId: activity.id.toString(), requesterId: OWNER, requesterRole: "admin" });
    expect(result.isRight()).toBe(true);
  });

  it("returns left when the record is no longer pending", async () => {
    const activity = addPendingActivity();
    const record = makePending(activity.id.toString());
    record.markSent("m", "t");
    await scheduledRepo.save(record);
    const result = await useCase.execute({ activityId: activity.id.toString(), requesterId: OWNER, requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
  });

  it("marks FAILED and fails the activity when the send fails", async () => {
    const activity = addPendingActivity();
    const record = makePending(activity.id.toString());
    await scheduledRepo.save(record);
    gmailPort.shouldFailSend = true;

    const result = await useCase.execute({ activityId: activity.id.toString(), requesterId: OWNER, requesterRole: "sdr" });

    expect(result.isLeft()).toBe(true);
    const saved = await scheduledRepo.findById(record.id.toString());
    expect(saved!.status).toBe("FAILED");
    const updated = await activitiesRepo.findByIdRaw(activity.id.toString());
    expect(updated!.failedAt).toBeDefined();
  });
});
