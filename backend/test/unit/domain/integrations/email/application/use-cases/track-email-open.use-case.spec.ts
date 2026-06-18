import { describe, it, expect, beforeEach } from "vitest";
import { TrackEmailOpenUseCase } from "@/domain/integrations/email/application/use-cases/track-email-open.use-case";
import { FakeEmailTrackingRepository } from "../../fakes/fake-email-tracking.repository";
import { FakeEmailEngagementReadPort } from "../../fakes/fake-email-engagement-read.port";
import { FakeCreateNotificationUseCase } from "../../fakes/fake-create-notification.use-case";
import type { EmailTrackingRecord } from "@/domain/integrations/email/application/repositories/email-tracking.repository";
import type { EmailEngagementContext } from "@/domain/integrations/email/application/ports/email-engagement-read.port";

const VALID_TOKEN = "validTrackingToken12345";

function makeRecord(overrides: Partial<EmailTrackingRecord> = {}): EmailTrackingRecord {
  return {
    id: "tracking-001",
    token: VALID_TOKEN,
    type: "open",
    emailMessageId: "email-msg-001",
    ownerId: "owner-001",
    ...overrides,
  };
}

let trackingRepo: FakeEmailTrackingRepository;
let engagementRead: FakeEmailEngagementReadPort;
let createNotification: FakeCreateNotificationUseCase;
let useCase: TrackEmailOpenUseCase;

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
  useCase = new TrackEmailOpenUseCase(trackingRepo, {} as any, engagementRead, createNotification as any);
});

describe("TrackEmailOpenUseCase", () => {
  it("records open and returns tracked=true for valid token", async () => {
    await trackingRepo.save(makeRecord());

    const result = await useCase.execute({
      token: VALID_TOKEN,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      ip: "192.168.1.1",
    });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().tracked).toBe(true);
    expect(trackingRepo.getOpenEvents()).toHaveLength(1);
    expect(trackingRepo.getOpenEvents()[0].token).toBe(VALID_TOKEN);
  });

  it("returns left for invalid token format (too short)", async () => {
    const result = await useCase.execute({ token: "short", userAgent: "Mozilla/5.0" });

    expect(result.isLeft()).toBe(true);
    expect(trackingRepo.getOpenEvents()).toHaveLength(0);
  });

  it("returns right(tracked: false) when token not found", async () => {
    // No record saved

    const result = await useCase.execute({
      token: VALID_TOKEN,
      userAgent: "Mozilla/5.0",
    });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().tracked).toBe(false);
    expect(trackingRepo.getOpenEvents()).toHaveLength(0);
  });

  it("filters bot — Googlebot", async () => {
    await trackingRepo.save(makeRecord());

    const result = await useCase.execute({
      token: VALID_TOKEN,
      userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().tracked).toBe(false);
    expect(trackingRepo.getOpenEvents()).toHaveLength(0);
  });

  it("filters bot — crawler", async () => {
    await trackingRepo.save(makeRecord());

    const result = await useCase.execute({
      token: VALID_TOKEN,
      userAgent: "some-crawler/1.0",
    });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().tracked).toBe(false);
  });

  it("filters proxy — Apple iCloud Privacy Relay (apple in UA)", async () => {
    await trackingRepo.save(makeRecord());

    const result = await useCase.execute({
      token: VALID_TOKEN,
      userAgent: "Apple Mail Privacy Protection / apple-icloud-proxy",
    });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().tracked).toBe(false);
  });

  it("filters proxy — AdsBot", async () => {
    await trackingRepo.save(makeRecord());

    const result = await useCase.execute({
      token: VALID_TOKEN,
      userAgent: "AdsBot-Google (+http://www.google.com/adsbot.html)",
    });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().tracked).toBe(false);
  });

  it("filters spider user agent", async () => {
    await trackingRepo.save(makeRecord());

    const result = await useCase.execute({
      token: VALID_TOKEN,
      userAgent: "spiderbot/1.0",
    });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().tracked).toBe(false);
  });

  it("does not filter legitimate human browser UA", async () => {
    await trackingRepo.save(makeRecord());

    const result = await useCase.execute({
      token: VALID_TOKEN,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      ip: "93.184.216.34",
    });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().tracked).toBe(true);
  });

  it("handles missing userAgent gracefully", async () => {
    await trackingRepo.save(makeRecord());

    const result = await useCase.execute({ token: VALID_TOKEN });

    expect(result.isRight()).toBe(true);
    // Empty UA is not bot — should track
    expect(result.unwrap().tracked).toBe(true);
  });

  it("passes userAgent and ip to recordOpen", async () => {
    await trackingRepo.save(makeRecord());

    await useCase.execute({
      token: VALID_TOKEN,
      userAgent: "Mozilla/5.0",
      ip: "10.0.0.1",
    });

    const event = trackingRepo.getOpenEvents()[0];
    expect(event.userAgent).toBe("Mozilla/5.0");
    expect(event.ip).toBe("10.0.0.1");
  });
});

describe("TrackEmailOpenUseCase — engagement notification", () => {
  it("notifies the owner when a direct (non-campaign) email is opened", async () => {
    await trackingRepo.save(makeRecord());
    engagementRead.context = makeContext({ isCampaign: false });

    await useCase.execute({ token: VALID_TOKEN, userAgent: "Mozilla/5.0" });

    expect(createNotification.calls).toHaveLength(1);
    const n = createNotification.calls[0];
    expect(n.type).toBe("EMAIL_OPENED");
    expect(n.userId).toBe("owner-001");
    expect(n.title).toContain("Cunha e Fintelman Advogados");
    expect(n.summary).toBe("Proposta comercial");
    expect(JSON.parse(n.payload!).leadId).toBe("lead-1");
    expect(JSON.parse(n.payload!).link).toBe("/leads/lead-1");
  });

  it("notifies on every open, including re-opens", async () => {
    await trackingRepo.save(makeRecord());
    engagementRead.context = makeContext();

    await useCase.execute({ token: VALID_TOKEN, userAgent: "Mozilla/5.0" });
    await useCase.execute({ token: VALID_TOKEN, userAgent: "Mozilla/5.0" });

    expect(createNotification.calls).toHaveLength(2);
  });

  it("does NOT notify for campaign emails (isCampaign)", async () => {
    await trackingRepo.save(makeRecord());
    engagementRead.context = makeContext({ isCampaign: true });

    await useCase.execute({ token: VALID_TOKEN, userAgent: "Mozilla/5.0" });

    expect(createNotification.calls).toHaveLength(0);
  });

  it("does NOT notify when a bot triggers the open", async () => {
    await trackingRepo.save(makeRecord());
    engagementRead.context = makeContext();

    await useCase.execute({ token: VALID_TOKEN, userAgent: "Googlebot/2.1" });

    expect(createNotification.calls).toHaveLength(0);
  });
});
