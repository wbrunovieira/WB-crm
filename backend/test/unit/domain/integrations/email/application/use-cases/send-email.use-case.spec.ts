import { describe, it, expect, beforeEach } from "vitest";
import { SendEmailUseCase } from "@/domain/integrations/email/application/use-cases/send-email.use-case";
import { FakeGmailPort } from "../../fakes/fake-gmail.port";
import { FakeGoogleOAuthPort } from "../../fakes/fake-google-oauth.port";
import { FakeEmailMessagesRepository } from "../../fakes/fake-email-messages.repository";
import { FakeEmailTrackingRepository } from "../../fakes/fake-email-tracking.repository";

const OWNER_ID = "owner-001";
const USER_ID = "user-001";

function makeInput(overrides: Partial<Parameters<SendEmailUseCase["execute"]>[0]> = {}) {
  return {
    userId: USER_ID,
    to: "recipient@example.com",
    subject: "Hello World",
    bodyHtml: "<p>Test email body</p>",
    ownerId: OWNER_ID,
    ...overrides,
  };
}

let gmailPort: FakeGmailPort;
let oauthPort: FakeGoogleOAuthPort;
let emailMessagesRepo: FakeEmailMessagesRepository;
let emailTrackingRepo: FakeEmailTrackingRepository;
let useCase: SendEmailUseCase;

beforeEach(() => {
  gmailPort = new FakeGmailPort();
  oauthPort = new FakeGoogleOAuthPort();
  emailMessagesRepo = new FakeEmailMessagesRepository();
  emailTrackingRepo = new FakeEmailTrackingRepository();

  useCase = new SendEmailUseCase(
    gmailPort,
    oauthPort,
    emailMessagesRepo,
    emailTrackingRepo,
  );
});

describe("SendEmailUseCase", () => {
  it("sends email and returns messageId and threadId", async () => {
    const result = await useCase.execute(makeInput());

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().messageId).toBeDefined();
    expect(result.unwrap().threadId).toBeDefined();
  });

  it("validates email address — returns left for invalid email", async () => {
    const result = await useCase.execute(makeInput({ to: "not-an-email" }));

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("EmailAddress");
  });

  it("returns left for empty email", async () => {
    const result = await useCase.execute(makeInput({ to: "" }));
    expect(result.isLeft()).toBe(true);
  });

  it("returns left when OAuth token retrieval fails", async () => {
    oauthPort.shouldFail = true;
    const result = await useCase.execute(makeInput());

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("OAuth token retrieval failed");
  });

  it("returns left when Gmail send fails", async () => {
    gmailPort.shouldFailSend = true;
    const result = await useCase.execute(makeInput());

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("Gmail send failed");
  });

  it("saves EmailMessage record after successful send", async () => {
    await useCase.execute(makeInput());

    expect(emailMessagesRepo.items).toHaveLength(1);
    const saved = emailMessagesRepo.items[0];
    expect(saved.to).toBe("recipient@example.com");
    expect(saved.subject).toBe("Hello World");
    expect(saved.ownerId).toBe(OWNER_ID);
    expect(saved.trackingToken).toBeDefined();
  });

  it("saves EmailTracking record for open tracking", async () => {
    await useCase.execute(makeInput());

    expect(emailTrackingRepo.items).toHaveLength(1);
    const tracking = emailTrackingRepo.items[0];
    expect(tracking.type).toBe("open");
    expect(tracking.token).toBeDefined();
    expect(tracking.ownerId).toBe(OWNER_ID);
  });

  it("injects tracking pixel into email body", async () => {
    await useCase.execute(makeInput({ bodyHtml: "<p>Hello</p>" }));

    const sentMessage = gmailPort.sentMessages[0];
    expect(sentMessage.bodyHtml).toContain("/track/open/");
    expect(sentMessage.bodyHtml).toContain('<img');
  });

  it("wraps links for click tracking", async () => {
    const result = await useCase.execute(makeInput({
      bodyHtml: '<a href="https://example.com">Click here</a>',
    }));

    expect(result.isRight()).toBe(true);
    const sentMessage = gmailPort.sentMessages[0];
    expect(sentMessage.bodyHtml).toContain("/track/click/");
    expect(sentMessage.bodyHtml).toContain("example.com");
  });

  it("uses provided threadId for replies", async () => {
    await useCase.execute(makeInput({ threadId: "thread-existing-123" }));

    const sentMessage = gmailPort.sentMessages[0];
    expect(sentMessage.threadId).toBe("thread-existing-123");
  });

  it("tracking token stored in EmailMessage matches EmailTracking record", async () => {
    await useCase.execute(makeInput());

    const emailMsg = emailMessagesRepo.items[0];
    const tracking = emailTrackingRepo.items[0];

    expect(emailMsg.trackingToken).toBe(tracking.token);
  });

  it("normalizes recipient email to lowercase", async () => {
    await useCase.execute(makeInput({ to: "RECIPIENT@EXAMPLE.COM" }));

    const saved = emailMessagesRepo.items[0];
    expect(saved.to).toBe("recipient@example.com");
  });
});
