import { describe, it, expect, beforeEach, vi } from "vitest";
import { PollGmailUseCase } from "@/domain/integrations/email/application/use-cases/poll-gmail.use-case";
import { FakeGmailPort } from "../../fakes/fake-gmail.port";
import { FakeEmailMessagesRepository } from "../../fakes/fake-email-messages.repository";
import { FakeActivitiesRepository } from "@test/unit/domain/integrations/whatsapp/fakes/fake-activities.repository";
import type { GmailMessage } from "@/domain/integrations/email/application/ports/gmail.port";
import { ProcessIncomingEmailUseCase } from "@/domain/integrations/email/application/use-cases/process-incoming-email.use-case";

const OWNER_ID = "owner-001";
const USER_ID = "user-001";

function makeGmailMessage(overrides: Partial<GmailMessage> = {}): GmailMessage {
  return {
    messageId: `msg-${Math.random().toString(36).slice(2)}`,
    threadId: "thread-001",
    from: "sender@example.com",
    to: "me@company.com",
    subject: "Test Subject",
    bodyText: "Test body",
    bodyHtml: "<p>Test body</p>",
    receivedAt: new Date(),
    ...overrides,
  };
}

let gmailPort: FakeGmailPort;
let emailMessagesRepo: FakeEmailMessagesRepository;
let activitiesRepo: FakeActivitiesRepository;
let processIncomingEmail: ProcessIncomingEmailUseCase;
let useCase: PollGmailUseCase;

const fakePrisma = {
  googleToken: {
    findFirst: vi.fn(),
    updateMany: vi.fn().mockResolvedValue({}),
  },
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
    create: vi.fn().mockResolvedValue({}),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default: sender matches a contact so messages are processed
  fakePrisma.contact.findFirst.mockResolvedValue({ id: "contact-default" });
  gmailPort = new FakeGmailPort();
  emailMessagesRepo = new FakeEmailMessagesRepository();
  activitiesRepo = new FakeActivitiesRepository();

  processIncomingEmail = new ProcessIncomingEmailUseCase(
    emailMessagesRepo,
    activitiesRepo,
    fakePrisma as never,
  );

  useCase = new PollGmailUseCase(
    gmailPort,
    processIncomingEmail,
    fakePrisma as never,
  );
});

describe("PollGmailUseCase", () => {
  it("returns processed=0 on first run (no historyId)", async () => {
    fakePrisma.googleToken.findFirst.mockResolvedValueOnce(null);

    const result = await useCase.execute({ userId: USER_ID, ownerId: OWNER_ID });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().processed).toBe(0);

    // Should have stored the initial historyId
    expect(fakePrisma.googleToken.updateMany).toHaveBeenCalledOnce();
  });

  it("processes new messages from history", async () => {
    fakePrisma.googleToken.findFirst.mockResolvedValueOnce({
      gmailHistoryId: "history-001",
    });

    const msg1 = makeGmailMessage({ messageId: "gmail-001" });
    const msg2 = makeGmailMessage({ messageId: "gmail-002" });
    gmailPort.historyMessages = [msg1, msg2];

    const result = await useCase.execute({ userId: USER_ID, ownerId: OWNER_ID });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().processed).toBe(2);
    expect(activitiesRepo.items).toHaveLength(2);
  });

  it("skips already-processed messages (idempotency)", async () => {
    fakePrisma.googleToken.findFirst.mockResolvedValueOnce({
      gmailHistoryId: "history-001",
    });

    const msg = makeGmailMessage({ messageId: "gmail-001" });
    gmailPort.historyMessages = [msg, msg]; // same message twice

    const result = await useCase.execute({ userId: USER_ID, ownerId: OWNER_ID });

    expect(result.isRight()).toBe(true);
    // Second is a duplicate — skipped
    expect(result.unwrap().processed).toBe(1);
    expect(activitiesRepo.items).toHaveLength(1);
  });

  it("returns processed=0 when no new messages in history", async () => {
    fakePrisma.googleToken.findFirst.mockResolvedValueOnce({
      gmailHistoryId: "history-current",
    });
    gmailPort.historyMessages = [];

    const result = await useCase.execute({ userId: USER_ID, ownerId: OWNER_ID });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().processed).toBe(0);
    // No messages — no historyId update needed
    expect(fakePrisma.googleToken.updateMany).not.toHaveBeenCalled();
  });

  it("updates historyId after processing messages", async () => {
    fakePrisma.googleToken.findFirst.mockResolvedValueOnce({
      gmailHistoryId: "history-old",
    });

    gmailPort.profileHistoryId = "history-new";
    gmailPort.historyMessages = [makeGmailMessage()];

    await useCase.execute({ userId: USER_ID, ownerId: OWNER_ID });

    expect(fakePrisma.googleToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ gmailHistoryId: "history-new" }),
      }),
    );
  });

  it("returns left on infrastructure error", async () => {
    fakePrisma.googleToken.findFirst.mockRejectedValueOnce(new Error("DB error"));

    const result = await useCase.execute({ userId: USER_ID, ownerId: OWNER_ID });

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("DB error");
  });
});
