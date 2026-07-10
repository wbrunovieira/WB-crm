import { describe, it, expect, beforeEach } from "vitest";
import { ScheduleEmailUseCase } from "@/domain/integrations/email/application/use-cases/schedule-email.use-case";
import { InMemoryScheduledEmailSendsRepository } from "../../fakes/in-memory-scheduled-email-sends.repository";
import { CreateActivityUseCase } from "@/domain/activities/application/use-cases/create-activity.use-case";
import { FakeActivitiesRepository } from "@test/unit/domain/integrations/whatsapp/fakes/fake-activities.repository";

const OWNER_ID = "owner-001";
const NOW = new Date("2026-06-30T12:00:00.000Z");
const FUTURE = new Date("2026-07-01T09:00:00.000Z");
const PAST = new Date("2026-06-29T09:00:00.000Z");

function makeInput(
  overrides: Partial<Parameters<ScheduleEmailUseCase["execute"]>[0]> = {},
) {
  return {
    ownerId: OWNER_ID,
    to: "recipient@example.com",
    subject: "Proposta",
    bodyHtml: "<p>Olá, segue a proposta.</p>",
    scheduledSendAt: FUTURE,
    ...overrides,
  };
}

let scheduledRepo: InMemoryScheduledEmailSendsRepository;
let activitiesRepo: FakeActivitiesRepository;
let createActivity: CreateActivityUseCase;
let useCase: ScheduleEmailUseCase;

beforeEach(() => {
  scheduledRepo = new InMemoryScheduledEmailSendsRepository();
  activitiesRepo = new FakeActivitiesRepository();
  createActivity = new CreateActivityUseCase(activitiesRepo);
  useCase = new ScheduleEmailUseCase(scheduledRepo, createActivity);
});

describe("ScheduleEmailUseCase — validation", () => {
  it("returns left when subject is empty", async () => {
    const result = await useCase.execute(makeInput({ subject: "   " }), NOW);
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("Assunto");
  });

  it("returns left when bodyHtml is empty", async () => {
    const result = await useCase.execute(makeInput({ bodyHtml: "  " }), NOW);
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("Mensagem");
  });

  it("returns left for an invalid recipient email", async () => {
    const result = await useCase.execute(makeInput({ to: "not-an-email" }), NOW);
    expect(result.isLeft()).toBe(true);
  });

  it("returns left for an invalid scheduledSendAt date", async () => {
    const result = await useCase.execute(
      makeInput({ scheduledSendAt: new Date("invalid") }),
      NOW,
    );
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("inválida");
  });

  it("returns left when scheduledSendAt is in the past", async () => {
    const result = await useCase.execute(makeInput({ scheduledSendAt: PAST }), NOW);
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("futuro");
  });

  it("returns left when scheduledSendAt equals now (not strictly future)", async () => {
    const result = await useCase.execute(makeInput({ scheduledSendAt: NOW }), NOW);
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("futuro");
  });

  it("does not create an activity or scheduled record when validation fails", async () => {
    await useCase.execute(makeInput({ to: "not-an-email" }), NOW);
    expect(activitiesRepo.items).toHaveLength(0);
    expect(scheduledRepo.items).toHaveLength(0);
  });
});

describe("ScheduleEmailUseCase — creates the pending activity", () => {
  it("creates a non-completed 'email' activity with scheduledSendAt", async () => {
    const result = await useCase.execute(makeInput({ leadId: "lead-1" }), NOW);

    expect(result.isRight()).toBe(true);
    expect(activitiesRepo.items).toHaveLength(1);
    const activity = activitiesRepo.items[0];
    expect(activity.type).toBe("email");
    expect(activity.ownerId).toBe(OWNER_ID);
    expect(activity.completed).toBe(false);
    expect(activity.scheduledSendAt?.getTime()).toBe(FUTURE.getTime());
    expect(activity.dueDate?.getTime()).toBe(FUTURE.getTime());
    expect(activity.emailSubject).toBe("Proposta");
    expect(activity.leadId).toBe("lead-1");
  });

  it("links the entity refs (contact/org/deal/partner) onto the activity", async () => {
    await useCase.execute(
      makeInput({ contactIds: ["c-1", "c-2"], organizationId: "org-1", dealId: "deal-1", partnerId: "partner-1" }),
      NOW,
    );
    const activity = activitiesRepo.items[0];
    expect(activity.contactId).toBe("c-1");
    expect(activity.organizationId).toBe("org-1");
    expect(activity.dealId).toBe("deal-1");
    expect(activity.partnerId).toBe("partner-1");
  });

  it("stores an HTML-stripped preview as the activity description", async () => {
    await useCase.execute(
      makeInput({ bodyHtml: "<p>Olá <strong>Bruno</strong>, tudo bem?</p>" }),
      NOW,
    );
    const activity = activitiesRepo.items[0];
    expect(activity.description).not.toContain("<");
    expect(activity.description).toContain("Olá");
    expect(activity.description).toContain("Bruno");
  });
});

describe("ScheduleEmailUseCase — persists the scheduled send", () => {
  it("saves a PENDING ScheduledEmailSend linked to the created activity", async () => {
    const result = await useCase.execute(makeInput({ leadId: "lead-1" }), NOW);

    expect(scheduledRepo.items).toHaveLength(1);
    const scheduled = scheduledRepo.items[0];
    expect(scheduled.status).toBe("PENDING");
    expect(scheduled.ownerId).toBe(OWNER_ID);
    expect(scheduled.activityId).toBe(result.unwrap().activityId);
    expect(scheduled.scheduledSendAt.getTime()).toBe(FUTURE.getTime());
    expect(scheduled.subject).toBe("Proposta");
    expect(scheduled.bodyHtml).toBe("<p>Olá, segue a proposta.</p>");
    expect(scheduled.leadId).toBe("lead-1");
  });

  it("normalizes the recipient email to lowercase", async () => {
    await useCase.execute(makeInput({ to: "RECIPIENT@EXAMPLE.COM" }), NOW);
    expect(scheduledRepo.items[0].to).toBe("recipient@example.com");
  });

  it("stores the primary contact and the full contactIds list", async () => {
    await useCase.execute(makeInput({ contactIds: ["c-1", "c-2"] }), NOW);
    const scheduled = scheduledRepo.items[0];
    expect(scheduled.contactId).toBe("c-1");
    expect(scheduled.contactIds).toEqual(["c-1", "c-2"]);
  });

  it("defaults fromEmail/threadId to null and attachments to []", async () => {
    await useCase.execute(makeInput(), NOW);
    const scheduled = scheduledRepo.items[0];
    expect(scheduled.fromEmail).toBeNull();
    expect(scheduled.threadId).toBeNull();
    expect(scheduled.attachments).toEqual([]);
  });

  it("carries fromEmail, threadId and attachments when provided", async () => {
    const attachments = [
      { filename: "proposta.pdf", mimeType: "application/pdf", data: "BASE64", size: 1234 },
    ];
    await useCase.execute(
      makeInput({ fromEmail: "bruno@saltoup.com", threadId: "thread-1", attachments }),
      NOW,
    );
    const scheduled = scheduledRepo.items[0];
    expect(scheduled.fromEmail).toBe("bruno@saltoup.com");
    expect(scheduled.threadId).toBe("thread-1");
    expect(scheduled.attachments).toEqual(attachments);
  });

  it("returns the scheduledEmailId, activityId and scheduledSendAt", async () => {
    const result = await useCase.execute(makeInput(), NOW);
    const out = result.unwrap();
    expect(out.scheduledEmailId).toBe(scheduledRepo.items[0].id.toString());
    expect(out.activityId).toBe(activitiesRepo.items[0].id.toString());
    expect(out.scheduledSendAt.getTime()).toBe(FUTURE.getTime());
  });

  it("findDue does not return the new send before its scheduled time", async () => {
    await useCase.execute(makeInput(), NOW);
    expect(await scheduledRepo.findDue(NOW, 10)).toHaveLength(0);
    const afterDue = new Date(FUTURE.getTime() + 1000);
    expect(await scheduledRepo.findDue(afterDue, 10)).toHaveLength(1);
  });
});
