import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProcessIncomingEmailUseCase } from "@/domain/integrations/email/application/use-cases/process-incoming-email.use-case";
import { FakeEmailMessagesRepository } from "../../fakes/fake-email-messages.repository";
import { FakeActivitiesRepository } from "@test/unit/domain/integrations/whatsapp/fakes/fake-activities.repository";
import type { GmailMessage } from "@/domain/integrations/email/application/ports/gmail.port";
import { Activity } from "@/domain/activities/enterprise/entities/activity";
import { UniqueEntityID } from "@/core/unique-entity-id";

const OWNER_ID = "owner-001";

function makeMessage(overrides: Partial<GmailMessage> = {}): GmailMessage {
  return {
    messageId: "gmail-msg-001",
    threadId: "thread-001",
    from: "sender@example.com",
    to: "me@mycompany.com",
    subject: "Proposta comercial",
    bodyText: "Olá, segue nossa proposta...",
    bodyHtml: "<p>Olá, segue nossa proposta...</p>",
    receivedAt: new Date("2024-01-15T10:00:00Z"),
    ...overrides,
  };
}

let emailMessagesRepo: FakeEmailMessagesRepository;
let activitiesRepo: FakeActivitiesRepository;
let useCase: ProcessIncomingEmailUseCase;

const createdNotifications: object[] = [];

// Fake PrismaService
const fakePrisma = {
  contact: {
    findFirst: vi.fn(),
  },
  leadContact: {
    findFirst: vi.fn().mockResolvedValue(null),
  },
  organization: {
    findFirst: vi.fn().mockResolvedValue(null),
  },
  notification: {
    create: vi.fn().mockImplementation(({ data }: { data: object }) => {
      createdNotifications.push(data);
      return Promise.resolve(data);
    }),
  },
  emailCampaign: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  emailCampaignRecipient: {
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
  emailCampaignSend: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  emailSuppression: {
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  createdNotifications.length = 0;
  // Default: sender matches a known contact so activity is created
  fakePrisma.contact.findFirst.mockResolvedValue({ id: "contact-default" });
  fakePrisma.leadContact.findFirst.mockResolvedValue(null);
  fakePrisma.organization.findFirst.mockResolvedValue(null);
  emailMessagesRepo = new FakeEmailMessagesRepository();
  activitiesRepo = new FakeActivitiesRepository();

  useCase = new ProcessIncomingEmailUseCase(
    emailMessagesRepo,
    activitiesRepo,
    fakePrisma as never,
  );
});

describe("ProcessIncomingEmailUseCase", () => {
  it("creates an activity and saves email message on first processing", async () => {
    const message = makeMessage();
    const result = await useCase.execute(message, OWNER_ID);

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().skipped).toBe(false);
    expect(result.unwrap().activityId).toBeDefined();

    expect(activitiesRepo.items).toHaveLength(1);
    const activity = activitiesRepo.items[0];
    expect(activity.type).toBe("email");
    expect(activity.subject).toContain("Proposta comercial");
    expect(activity.ownerId).toBe(OWNER_ID);
    expect(activity.completed).toBe(true);

    expect(emailMessagesRepo.items).toHaveLength(1);
    expect(emailMessagesRepo.items[0].gmailMessageId).toBe("gmail-msg-001");
  });

  it("returns skipped=true for duplicate messageId (idempotency)", async () => {
    const message = makeMessage();

    // First run
    await useCase.execute(message, OWNER_ID);
    expect(emailMessagesRepo.items).toHaveLength(1);

    // Second run — same messageId
    const result = await useCase.execute(message, OWNER_ID);

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().skipped).toBe(true);

    // No new records
    expect(emailMessagesRepo.items).toHaveLength(1);
    expect(activitiesRepo.items).toHaveLength(1);
  });

  it("links activity to contact when contact email matches", async () => {
    fakePrisma.contact.findFirst.mockResolvedValue({ id: "contact-abc" });

    const message = makeMessage({ from: "contact@example.com" });
    const result = await useCase.execute(message, OWNER_ID);

    expect(result.isRight()).toBe(true);
    const activity = activitiesRepo.items[0];
    expect(activity.contactId).toBe("contact-abc");
    expect(activity.leadId).toBeUndefined();
  });

  it("links activity to lead when no contact found but leadContact matches", async () => {
    fakePrisma.contact.findFirst.mockResolvedValue(null);
    fakePrisma.leadContact.findFirst.mockResolvedValue({ leadId: "lead-xyz" });

    const message = makeMessage({ from: "lead-contact@example.com" });
    const result = await useCase.execute(message, OWNER_ID);

    expect(result.isRight()).toBe(true);
    const activity = activitiesRepo.items[0];
    expect(activity.leadId).toBe("lead-xyz");
    expect(activity.contactId).toBeUndefined();
  });

  it("skips processing when sender email matches no contact, lead contact, or organization", async () => {
    fakePrisma.contact.findFirst.mockResolvedValue(null);
    fakePrisma.leadContact.findFirst.mockResolvedValue(null);
    fakePrisma.organization.findFirst.mockResolvedValue(null);

    const message = makeMessage({ from: "unknown@nowhere.com" });
    const result = await useCase.execute(message, OWNER_ID);

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().skipped).toBe(true);
    expect(activitiesRepo.items).toHaveLength(0);
    expect(emailMessagesRepo.items).toHaveLength(0);
  });

  it("links activity to organization when organization email matches and no contact/lead found", async () => {
    fakePrisma.contact.findFirst.mockResolvedValue(null);
    fakePrisma.leadContact.findFirst.mockResolvedValue(null);
    fakePrisma.organization.findFirst.mockResolvedValue({ id: "org-999" });

    const message = makeMessage({ from: "contact@organization.com" });
    const result = await useCase.execute(message, OWNER_ID);

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().skipped).toBe(false);
    expect(activitiesRepo.items).toHaveLength(1);
    const activity = activitiesRepo.items[0];
    expect(activity.organizationId).toBe("org-999");
    expect(activity.contactId).toBeUndefined();
    expect(activity.leadId).toBeUndefined();
  });

  it("parses 'Name <email>' format correctly", async () => {
    fakePrisma.contact.findFirst.mockImplementationOnce(
      ({ where }: { where: { email: { equals: string } } }) => {
        if (where.email.equals === "john@example.com") {
          return Promise.resolve({ id: "contact-john" });
        }
        return Promise.resolve(null);
      },
    );

    const message = makeMessage({ from: "John Doe <john@example.com>" });
    await useCase.execute(message, OWNER_ID);

    const activity = activitiesRepo.items[0];
    expect(activity.contactId).toBe("contact-john");
  });

  it("stores emailMessageId on the activity", async () => {
    const message = makeMessage({ messageId: "gmail-unique-123" });
    await useCase.execute(message, OWNER_ID);

    const activity = activitiesRepo.items[0];
    expect(activity.emailMessageId).toBe("gmail-unique-123");
  });

  it("stores emailThreadId on the activity", async () => {
    const message = makeMessage({ threadId: "thread-abc" });
    await useCase.execute(message, OWNER_ID);

    const activity = activitiesRepo.items[0];
    expect(activity.emailThreadId).toBe("thread-abc");
  });

  it("returns left on infrastructure failure", async () => {
    fakePrisma.contact.findFirst.mockRejectedValueOnce(new Error("DB connection failed"));

    const message = makeMessage();
    const result = await useCase.execute(message, OWNER_ID);

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("DB connection failed");
  });

  it("handles message with empty subject gracefully", async () => {
    const message = makeMessage({ subject: "" });
    const result = await useCase.execute(message, OWNER_ID);

    expect(result.isRight()).toBe(true);
    const activity = activitiesRepo.items[0];
    expect(activity.subject).toContain("(sem assunto)");
  });

  it("creates EMAIL_RECEIVED notification when contact match found", async () => {
    const message = makeMessage({ subject: "Proposta comercial" });
    await useCase.execute(message, OWNER_ID);

    expect(createdNotifications).toHaveLength(1);
    const notif = createdNotifications[0] as Record<string, unknown>;
    expect(notif.type).toBe("EMAIL_RECEIVED");
    expect(notif.userId).toBe(OWNER_ID);
    expect((notif.title as string)).toContain("Proposta comercial");
  });

  it("includes receivedToEmail in notification payload so UI knows which alias was targeted", async () => {
    const message = makeMessage({ to: "bruno@saltoup.com", subject: "Test" });
    await useCase.execute(message, OWNER_ID);

    const notif = createdNotifications[0] as Record<string, unknown>;
    const payload = JSON.parse(notif.payload as string);
    expect(payload.receivedToEmail).toBe("bruno@saltoup.com");
  });

  it("includes a link to the lead page in the notification payload when a lead matches", async () => {
    fakePrisma.contact.findFirst.mockResolvedValue(null);
    fakePrisma.leadContact.findFirst.mockResolvedValue({ leadId: "lead-xyz" });

    await useCase.execute(makeMessage({ from: "lead-contact@example.com" }), OWNER_ID);

    const notif = createdNotifications[0] as Record<string, unknown>;
    const payload = JSON.parse(notif.payload as string);
    expect(payload.link).toBe("/leads/lead-xyz");
  });

  it("includes a link to the organization page in the notification payload when an organization matches", async () => {
    fakePrisma.contact.findFirst.mockResolvedValue(null);
    fakePrisma.leadContact.findFirst.mockResolvedValue(null);
    fakePrisma.organization.findFirst.mockResolvedValue({ id: "org-999" });

    await useCase.execute(makeMessage({ from: "contact@organization.com" }), OWNER_ID);

    const notif = createdNotifications[0] as Record<string, unknown>;
    const payload = JSON.parse(notif.payload as string);
    expect(payload.link).toBe("/organizations/org-999");
  });

  it("includes a link to the contact page in the notification payload when a contact matches", async () => {
    fakePrisma.contact.findFirst.mockResolvedValue({ id: "contact-abc" });

    await useCase.execute(makeMessage({ from: "contact@example.com" }), OWNER_ID);

    const notif = createdNotifications[0] as Record<string, unknown>;
    const payload = JSON.parse(notif.payload as string);
    expect(payload.link).toBe("/contacts/contact-abc");
  });

  it("does NOT create notification when sender is unknown (skipped)", async () => {
    fakePrisma.contact.findFirst.mockResolvedValue(null);
    fakePrisma.leadContact.findFirst.mockResolvedValue(null);
    fakePrisma.organization.findFirst.mockResolvedValue(null);

    await useCase.execute(makeMessage(), OWNER_ID);

    expect(createdNotifications).toHaveLength(0);
  });
});

describe("ProcessIncomingEmailUseCase — bounce detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakePrisma.contact.findFirst.mockResolvedValue(null);
    fakePrisma.leadContact.findFirst.mockResolvedValue(null);
    fakePrisma.organization.findFirst.mockResolvedValue(null);
    fakePrisma.emailCampaign.findMany.mockResolvedValue([{ id: "camp-1" }]);
    fakePrisma.emailCampaignRecipient.updateMany.mockResolvedValue({ count: 1 });
    fakePrisma.emailCampaignSend.findMany.mockResolvedValue([]);
    fakePrisma.emailSuppression.findFirst.mockResolvedValue(null);
    fakePrisma.emailSuppression.create.mockResolvedValue({});
    emailMessagesRepo = new FakeEmailMessagesRepository();
    activitiesRepo = new FakeActivitiesRepository();
    useCase = new ProcessIncomingEmailUseCase(emailMessagesRepo, activitiesRepo, fakePrisma as never);
  });

  it("detects bounce from mailer-daemon and marks recipients as BOUNCED", async () => {
    const message = makeMessage({
      from: "mailer-daemon@googlemail.com",
      subject: "Delivery Status Notification (Failure)",
      bodyText: "Final-Recipient: rfc822; bounce@example.com\nStatus: 5.1.1",
    });

    const result = await useCase.execute(message, OWNER_ID);

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().skipped).toBe(false);
    expect(result.unwrap().bounced).toBe(true);
    expect(fakePrisma.emailCampaignRecipient.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "BOUNCED" } }),
    );
  });

  it("adds bounced email to suppression list", async () => {
    const message = makeMessage({
      from: "postmaster@mail.example.com",
      bodyText: "Final-Recipient: rfc822; victim@domain.com",
    });

    await useCase.execute(message, OWNER_ID);

    expect(fakePrisma.emailSuppression.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "victim@domain.com", ownerId: OWNER_ID, reason: "bounced" }),
      }),
    );
  });

  it("does not duplicate suppression when email is already suppressed", async () => {
    fakePrisma.emailSuppression.findFirst.mockResolvedValue({ id: "existing" });

    const message = makeMessage({
      from: "mailer-daemon@googlemail.com",
      bodyText: "Final-Recipient: rfc822; already@suppressed.com",
    });

    await useCase.execute(message, OWNER_ID);

    expect(fakePrisma.emailSuppression.create).not.toHaveBeenCalled();
  });

  it("extracts bounced email from 'Original-Recipient' DSN header", async () => {
    const message = makeMessage({
      from: "mailer-daemon@googlemail.com",
      bodyText: "Original-Recipient: rfc822; other@example.com\nSome other text",
    });

    await useCase.execute(message, OWNER_ID);

    expect(fakePrisma.emailSuppression.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "other@example.com" }),
      }),
    );
  });

  it("extracts bounced email from Gmail human-readable format", async () => {
    const message = makeMessage({
      from: "Mail Delivery Subsystem <mailer-daemon@googlemail.com>",
      bodyText: "Your message wasn't delivered to human@readable.com because the address couldn't be found.",
    });

    await useCase.execute(message, OWNER_ID);

    expect(fakePrisma.emailSuppression.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "human@readable.com" }),
      }),
    );
  });

  it("returns skipped=true when bounce body contains no extractable email", async () => {
    const message = makeMessage({
      from: "mailer-daemon@googlemail.com",
      bodyText: "Something went wrong but no email address here.",
    });

    const result = await useCase.execute(message, OWNER_ID);

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().skipped).toBe(true);
    expect(fakePrisma.emailSuppression.create).not.toHaveBeenCalled();
  });

  it("does not treat normal email from known contact as bounce", async () => {
    fakePrisma.contact.findFirst.mockResolvedValue({ id: "contact-1" });

    const message = makeMessage({ from: "normal@contact.com" });
    const result = await useCase.execute(message, OWNER_ID);

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().bounced).toBeUndefined();
    expect(fakePrisma.emailCampaignRecipient.updateMany).not.toHaveBeenCalled();
  });
});

describe("ProcessIncomingEmailUseCase — bounce updates linked campaign_email activity", () => {
  function makeCampaignActivity(sendId: string): Activity {
    return Activity.create(
      {
        ownerId: OWNER_ID,
        type: "campaign_email",
        subject: "Campanha X",
        completed: true,
        completedAt: new Date("2024-01-10T08:00:00Z"),
        meetingNoShow: false,
        emailReplied: false,
        emailOpenCount: 0,
        emailLinkClickCount: 0,
        emailCampaignSendId: sendId,
        emailCampaignId: "camp-1",
      },
      new UniqueEntityID(),
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    fakePrisma.contact.findFirst.mockResolvedValue(null);
    fakePrisma.leadContact.findFirst.mockResolvedValue(null);
    fakePrisma.organization.findFirst.mockResolvedValue(null);
    fakePrisma.emailCampaign.findMany.mockResolvedValue([{ id: "camp-1" }]);
    fakePrisma.emailCampaignRecipient.updateMany.mockResolvedValue({ count: 1 });
    fakePrisma.emailCampaignSend.findMany.mockResolvedValue([]);
    fakePrisma.emailSuppression.findFirst.mockResolvedValue(null);
    fakePrisma.emailSuppression.create.mockResolvedValue({});
    emailMessagesRepo = new FakeEmailMessagesRepository();
    activitiesRepo = new FakeActivitiesRepository();
    useCase = new ProcessIncomingEmailUseCase(emailMessagesRepo, activitiesRepo, fakePrisma as never);
  });

  it("marks linked campaign_email activity as failed when bounce NDR arrives", async () => {
    const sendId = "send-abc-001";
    const activity = makeCampaignActivity(sendId);
    activitiesRepo.items.push(activity);

    fakePrisma.emailCampaignSend.findMany.mockResolvedValue([{ id: sendId }]);

    const message = makeMessage({
      from: "mailer-daemon@googlemail.com",
      bodyText: "Final-Recipient: rfc822; bounced@example.com",
    });

    await useCase.execute(message, OWNER_ID);

    const updated = activitiesRepo.items.find((a) => a.emailCampaignSendId === sendId)!;
    expect(updated.failedAt).toBeDefined();
    expect(updated.failReason).toBe("Email retornou (bounce)");
    expect(updated.completed).toBe(false);
  });

  it("does not double-fail an activity already marked as failed", async () => {
    const sendId = "send-already-failed";
    const activity = makeCampaignActivity(sendId);
    activity.fail("Erro anterior");
    const originalFailedAt = activity.failedAt!;
    activitiesRepo.items.push(activity);

    fakePrisma.emailCampaignSend.findMany.mockResolvedValue([{ id: sendId }]);

    await new Promise((r) => setTimeout(r, 5)); // garante timestamp diferente

    const message = makeMessage({
      from: "mailer-daemon@googlemail.com",
      bodyText: "Final-Recipient: rfc822; bounced@example.com",
    });

    await useCase.execute(message, OWNER_ID);

    const afterUpdate = activitiesRepo.items.find((a) => a.emailCampaignSendId === sendId)!;
    expect(afterUpdate.failedAt!.getTime()).toBe(originalFailedAt.getTime());
  });

  it("trata 'Entrega incompleta' do Gmail PT-BR (DNS SERVFAIL) como bounce permanente", async () => {
    const sendId = "send-dns-fail-001";
    const activity = makeCampaignActivity(sendId);
    activitiesRepo.items.push(activity);

    fakePrisma.emailCampaignSend.findMany.mockResolvedValue([{ id: sendId }]);

    const message = makeMessage({
      from: "Mail Delivery Subsystem <mailer-daemon@googlemail.com>",
      subject: "Entrega incompleta",
      bodyText:
        "Ocorreu um problema temporário na entrega da mensagem para neumannmkt@temtudopetropolis.com.br. " +
        "O Gmail tentará novamente por mais 44 horas. Você será notificado se a falha na entrega da mensagem for permanente. " +
        "A resposta foi: DNS Error: DNS type 'mx' lookup of temtudopetropolis.com.br responded with code SERVFAIL",
    });

    const result = await useCase.execute(message, OWNER_ID);

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().bounced).toBe(true);
    expect(fakePrisma.emailCampaignRecipient.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "BOUNCED" } }),
    );
    expect(fakePrisma.emailSuppression.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "neumannmkt@temtudopetropolis.com.br" }),
      }),
    );
    const updated = activitiesRepo.items.find((a) => a.emailCampaignSendId === sendId)!;
    expect(updated.failedAt).toBeDefined();
    expect(updated.failReason).toBe("Email retornou (bounce)");
  });

  it("does not update activity when no send record is linked to the bounce", async () => {
    const activity = makeCampaignActivity("send-unrelated");
    activitiesRepo.items.push(activity);

    // no matching send returned
    fakePrisma.emailCampaignSend.findMany.mockResolvedValue([]);

    const message = makeMessage({
      from: "mailer-daemon@googlemail.com",
      bodyText: "Final-Recipient: rfc822; other@example.com",
    });

    await useCase.execute(message, OWNER_ID);

    // activity untouched
    const untouched = activitiesRepo.items[0];
    expect(untouched.failedAt).toBeUndefined();
    expect(untouched.completed).toBe(true);
  });

  it("updates multiple activities when multiple sends are linked to the bounced email", async () => {
    const sendId1 = "send-multi-1";
    const sendId2 = "send-multi-2";
    activitiesRepo.items.push(makeCampaignActivity(sendId1));
    activitiesRepo.items.push(makeCampaignActivity(sendId2));

    fakePrisma.emailCampaignSend.findMany.mockResolvedValue([{ id: sendId1 }, { id: sendId2 }]);

    const message = makeMessage({
      from: "mailer-daemon@googlemail.com",
      bodyText: "Final-Recipient: rfc822; multi@example.com",
    });

    await useCase.execute(message, OWNER_ID);

    for (const sendId of [sendId1, sendId2]) {
      const act = activitiesRepo.items.find((a) => a.emailCampaignSendId === sendId)!;
      expect(act.failedAt).toBeDefined();
      expect(act.completed).toBe(false);
    }
  });
});
