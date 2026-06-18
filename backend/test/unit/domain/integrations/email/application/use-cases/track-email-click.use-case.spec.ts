import { describe, it, expect, beforeEach } from "vitest";
import { TrackEmailClickUseCase } from "@/domain/integrations/email/application/use-cases/track-email-click.use-case";
import { FakeEmailTrackingRepository } from "../../fakes/fake-email-tracking.repository";
import { FakeEmailEngagementReadPort } from "../../fakes/fake-email-engagement-read.port";
import { FakeCreateNotificationUseCase } from "../../fakes/fake-create-notification.use-case";
import type { EmailTrackingRecord } from "@/domain/integrations/email/application/repositories/email-tracking.repository";
import type { EmailEngagementContext } from "@/domain/integrations/email/application/ports/email-engagement-read.port";

const VALID_TOKEN = "validClickToken12345";
const TARGET_URL = "https://example.com/landing-page";

function makeRecord(overrides: Partial<EmailTrackingRecord> = {}): EmailTrackingRecord {
  return {
    id: "tracking-click-001",
    token: VALID_TOKEN,
    type: "click",
    emailMessageId: "email-msg-001",
    ownerId: "owner-001",
    ...overrides,
  };
}

let trackingRepo: FakeEmailTrackingRepository;
let engagementRead: FakeEmailEngagementReadPort;
let createNotification: FakeCreateNotificationUseCase;
let useCase: TrackEmailClickUseCase;

function makeContext(overrides: Partial<EmailEngagementContext> = {}): EmailEngagementContext {
  return {
    activityId: "act-1",
    ownerId: "owner-001",
    isCampaign: false,
    subject: "Proposta comercial",
    recipientName: "Cunha e Fintelman Advogados",
    leadId: "lead-1",
    ...overrides,
  };
}

beforeEach(() => {
  trackingRepo = new FakeEmailTrackingRepository();
  engagementRead = new FakeEmailEngagementReadPort();
  createNotification = new FakeCreateNotificationUseCase();
  useCase = new TrackEmailClickUseCase(trackingRepo, {} as any, engagementRead, createNotification as any);
});

describe("TrackEmailClickUseCase", () => {
  it("records click and returns redirectUrl on valid token + url", async () => {
    await trackingRepo.save(makeRecord());

    const result = await useCase.execute({
      token: VALID_TOKEN,
      url: TARGET_URL,
      userAgent: "Mozilla/5.0",
    });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().redirectUrl).toBe(TARGET_URL);

    expect(trackingRepo.getClickEvents()).toHaveLength(1);
    expect(trackingRepo.getClickEvents()[0].token).toBe(VALID_TOKEN);
    expect(trackingRepo.getClickEvents()[0].url).toBe(TARGET_URL);
  });

  it("returns left for invalid token format (too short)", async () => {
    const result = await useCase.execute({ token: "abc", url: TARGET_URL });

    expect(result.isLeft()).toBe(true);
    expect(trackingRepo.getClickEvents()).toHaveLength(0);
  });

  it("returns left for empty url", async () => {
    await trackingRepo.save(makeRecord());

    const result = await useCase.execute({ token: VALID_TOKEN, url: "" });

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("URL is required");
  });

  it("returns left for whitespace-only url", async () => {
    await trackingRepo.save(makeRecord());

    const result = await useCase.execute({ token: VALID_TOKEN, url: "   " });

    expect(result.isLeft()).toBe(true);
  });

  it("records click even when token record not found in repo (best-effort)", async () => {
    // No record saved, but click should still be recorded (best-effort)
    const result = await useCase.execute({
      token: VALID_TOKEN,
      url: TARGET_URL,
    });

    // Still returns the redirect URL
    expect(result.isRight()).toBe(true);
    expect(result.unwrap().redirectUrl).toBe(TARGET_URL);
  });

  it("trims whitespace from url", async () => {
    await trackingRepo.save(makeRecord());

    const result = await useCase.execute({
      token: VALID_TOKEN,
      url: "  https://example.com  ",
    });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().redirectUrl).toBe("https://example.com");
  });

  it("passes userAgent and ip to recordClick", async () => {
    await trackingRepo.save(makeRecord());

    await useCase.execute({
      token: VALID_TOKEN,
      url: TARGET_URL,
      userAgent: "Chrome/120",
      ip: "203.0.113.42",
    });

    const event = trackingRepo.getClickEvents()[0];
    expect(event.userAgent).toBe("Chrome/120");
    expect(event.ip).toBe("203.0.113.42");
  });

  it("handles https URLs with query strings", async () => {
    await trackingRepo.save(makeRecord());

    const urlWithQuery = "https://example.com/page?utm_source=email&utm_campaign=test";
    const result = await useCase.execute({
      token: VALID_TOKEN,
      url: urlWithQuery,
    });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().redirectUrl).toBe(urlWithQuery);
  });
});

describe("TrackEmailClickUseCase — engagement notification", () => {
  it("notifies the owner when a direct (non-campaign) email link is clicked, with the url", async () => {
    await trackingRepo.save(makeRecord());
    engagementRead.context = makeContext({ isCampaign: false });

    await useCase.execute({ token: VALID_TOKEN, url: TARGET_URL });

    expect(createNotification.calls).toHaveLength(1);
    const n = createNotification.calls[0];
    expect(n.type).toBe("EMAIL_CLICKED");
    expect(n.userId).toBe("owner-001");
    expect(n.title).toContain("Cunha e Fintelman Advogados");
    expect(JSON.parse(n.payload!).url).toBe(TARGET_URL);
  });

  it("notifies on every click, including repeats", async () => {
    await trackingRepo.save(makeRecord());
    engagementRead.context = makeContext();

    await useCase.execute({ token: VALID_TOKEN, url: TARGET_URL });
    await useCase.execute({ token: VALID_TOKEN, url: TARGET_URL });

    expect(createNotification.calls).toHaveLength(2);
  });

  it("does NOT notify for campaign emails (isCampaign)", async () => {
    await trackingRepo.save(makeRecord());
    engagementRead.context = makeContext({ isCampaign: true });

    await useCase.execute({ token: VALID_TOKEN, url: TARGET_URL });

    expect(createNotification.calls).toHaveLength(0);
  });
});
