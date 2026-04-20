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

// Fake PrismaService
const fakePrisma = {
  contact: {
    findFirst: vi.fn().mockResolvedValue(null),
  },
  leadContact: {
    findFirst: vi.fn().mockResolvedValue(null),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
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
    expect(result.value.skipped).toBe(false);
    expect(result.value.activityId).toBeDefined();

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
    expect(result.value.skipped).toBe(true);

    // No new records
    expect(emailMessagesRepo.items).toHaveLength(1);
    expect(activitiesRepo.items).toHaveLength(1);
  });

  it("links activity to contact when contact email matches", async () => {
    fakePrisma.contact.findFirst.mockResolvedValueOnce({ id: "contact-abc" });

    const message = makeMessage({ from: "contact@example.com" });
    const result = await useCase.execute(message, OWNER_ID);

    expect(result.isRight()).toBe(true);
    const activity = activitiesRepo.items[0];
    expect(activity.contactId).toBe("contact-abc");
    expect(activity.leadId).toBeUndefined();
  });

  it("links activity to lead when no contact found but leadContact matches", async () => {
    fakePrisma.contact.findFirst.mockResolvedValueOnce(null);
    fakePrisma.leadContact.findFirst.mockResolvedValueOnce({ leadId: "lead-xyz" });

    const message = makeMessage({ from: "lead-contact@example.com" });
    const result = await useCase.execute(message, OWNER_ID);

    expect(result.isRight()).toBe(true);
    const activity = activitiesRepo.items[0];
    expect(activity.leadId).toBe("lead-xyz");
    expect(activity.contactId).toBeUndefined();
  });

  it("creates activity without contact/lead link when no match found", async () => {
    fakePrisma.contact.findFirst.mockResolvedValueOnce(null);
    fakePrisma.leadContact.findFirst.mockResolvedValueOnce(null);

    const message = makeMessage({ from: "unknown@nowhere.com" });
    const result = await useCase.execute(message, OWNER_ID);

    expect(result.isRight()).toBe(true);
    const activity = activitiesRepo.items[0];
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
    expect(result.value.message).toContain("DB connection failed");
  });

  it("handles message with empty subject gracefully", async () => {
    const message = makeMessage({ subject: "" });
    const result = await useCase.execute(message, OWNER_ID);

    expect(result.isRight()).toBe(true);
    const activity = activitiesRepo.items[0];
    expect(activity.subject).toContain("(sem assunto)");
  });
});
