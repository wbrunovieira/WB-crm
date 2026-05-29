import { describe, it, expect, beforeEach } from "vitest";
import { PollGmailUseCase } from "@/domain/integrations/email/application/use-cases/poll-gmail.use-case";
import { FakeGmailPort } from "../../fakes/fake-gmail.port";
import type { GmailMessage } from "@/domain/integrations/email/application/ports/gmail.port";
import { right } from "@/core/either";
import { GoogleTokenRepository, type GoogleTokenRecord } from "@/domain/integrations/email/application/repositories/google-token.repository";

// Stub of ProcessIncomingEmailUseCase — poll-gmail is unit-tested in isolation.
// Dedups by messageId so the idempotency test still holds.
class FakeProcessIncomingEmail {
  public seen = new Set<string>();
  public processedCount = 0;
  async execute(message: GmailMessage, _ownerId: string) {
    if (this.seen.has(message.messageId)) return right({ skipped: true });
    this.seen.add(message.messageId);
    this.processedCount++;
    return right({ activityId: message.messageId, skipped: false });
  }
}

// In-memory fake for the singleton Google token
class FakeGoogleTokenRepository extends GoogleTokenRepository {
  public record: GoogleTokenRecord | null = null;
  public savedHistoryIds: string[] = [];
  public findError: Error | null = null;

  async findFirst(): Promise<GoogleTokenRecord | null> {
    if (this.findError) throw this.findError;
    return this.record;
  }
  async updateHistoryId(historyId: string): Promise<void> {
    this.savedHistoryIds.push(historyId);
    if (this.record) this.record.gmailHistoryId = historyId;
  }
  async save(): Promise<GoogleTokenRecord> { throw new Error("not used in tests"); }
  async delete(): Promise<void> {}
}

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
let processIncomingEmail: FakeProcessIncomingEmail;
let googleTokenRepo: FakeGoogleTokenRepository;
let useCase: PollGmailUseCase;

beforeEach(() => {
  gmailPort = new FakeGmailPort();
  googleTokenRepo = new FakeGoogleTokenRepository();
  processIncomingEmail = new FakeProcessIncomingEmail();

  useCase = new PollGmailUseCase(
    gmailPort,
    processIncomingEmail as never,
    googleTokenRepo,
  );
});

function tokenWithHistory(gmailHistoryId: string | null): GoogleTokenRecord {
  return {
    id: "google-token-singleton",
    accessToken: "a",
    refreshToken: "r",
    expiresAt: new Date(),
    scope: "s",
    email: "me@company.com",
    gmailHistoryId,
  };
}

describe("PollGmailUseCase", () => {
  it("returns processed=0 on first run (no historyId)", async () => {
    googleTokenRepo.record = null;

    const result = await useCase.execute({ userId: USER_ID, ownerId: OWNER_ID });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().processed).toBe(0);

    // Should have stored the initial historyId
    expect(googleTokenRepo.savedHistoryIds).toHaveLength(1);
  });

  it("processes new messages from history", async () => {
    googleTokenRepo.record = tokenWithHistory("history-001");

    const msg1 = makeGmailMessage({ messageId: "gmail-001" });
    const msg2 = makeGmailMessage({ messageId: "gmail-002" });
    gmailPort.historyMessages = [msg1, msg2];

    const result = await useCase.execute({ userId: USER_ID, ownerId: OWNER_ID });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().processed).toBe(2);
    expect(processIncomingEmail.processedCount).toBe(2);
  });

  it("skips already-processed messages (idempotency)", async () => {
    googleTokenRepo.record = tokenWithHistory("history-001");

    const msg = makeGmailMessage({ messageId: "gmail-001" });
    gmailPort.historyMessages = [msg, msg]; // same message twice

    const result = await useCase.execute({ userId: USER_ID, ownerId: OWNER_ID });

    expect(result.isRight()).toBe(true);
    // Second is a duplicate — skipped
    expect(result.unwrap().processed).toBe(1);
    expect(processIncomingEmail.processedCount).toBe(1);
  });

  it("returns processed=0 when no new messages in history", async () => {
    googleTokenRepo.record = tokenWithHistory("history-current");
    gmailPort.historyMessages = [];

    const result = await useCase.execute({ userId: USER_ID, ownerId: OWNER_ID });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().processed).toBe(0);
    // historyId is always advanced to prevent stale IDs from getting stuck
    expect(googleTokenRepo.savedHistoryIds.length).toBeGreaterThan(0);
  });

  it("updates historyId after processing messages", async () => {
    googleTokenRepo.record = tokenWithHistory("history-old");

    gmailPort.profileHistoryId = "history-new";
    gmailPort.historyMessages = [makeGmailMessage()];

    await useCase.execute({ userId: USER_ID, ownerId: OWNER_ID });

    expect(googleTokenRepo.savedHistoryIds).toContain("history-new");
  });

  it("returns left on infrastructure error", async () => {
    googleTokenRepo.findError = new Error("DB error");

    const result = await useCase.execute({ userId: USER_ID, ownerId: OWNER_ID });

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("DB error");
  });
});
