import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProcessIncomingEmailUseCase } from "@/domain/integrations/email/application/use-cases/process-incoming-email.use-case";
import { FakeEmailMessagesRepository } from "../../fakes/fake-email-messages.repository";
import { FakeActivitiesRepository } from "@test/unit/domain/integrations/whatsapp/fakes/fake-activities.repository";
import type { GmailMessage } from "@/domain/integrations/email/application/ports/gmail.port";

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

  it("does NOT create notification when sender is unknown (skipped)", async () => {
    fakePrisma.contact.findFirst.mockResolvedValue(null);
    fakePrisma.leadContact.findFirst.mockResolvedValue(null);
    fakePrisma.organization.findFirst.mockResolvedValue(null);

    await useCase.execute(makeMessage(), OWNER_ID);

    expect(createdNotifications).toHaveLength(0);
  });
});
