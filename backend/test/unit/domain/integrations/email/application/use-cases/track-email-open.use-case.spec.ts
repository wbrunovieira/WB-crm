import { describe, it, expect, beforeEach } from "vitest";
import { TrackEmailOpenUseCase } from "@/domain/integrations/email/application/use-cases/track-email-open.use-case";
import { FakeEmailTrackingRepository } from "../../fakes/fake-email-tracking.repository";
import type { EmailTrackingRecord } from "@/domain/integrations/email/application/repositories/email-tracking.repository";

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
let useCase: TrackEmailOpenUseCase;

beforeEach(() => {
  trackingRepo = new FakeEmailTrackingRepository();
  useCase = new TrackEmailOpenUseCase(trackingRepo);
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
    expect(result.value.tracked).toBe(true);
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
    expect(result.value.tracked).toBe(false);
    expect(trackingRepo.getOpenEvents()).toHaveLength(0);
  });

  it("filters bot — Googlebot", async () => {
    await trackingRepo.save(makeRecord());

    const result = await useCase.execute({
      token: VALID_TOKEN,
      userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    });

    expect(result.isRight()).toBe(true);
    expect(result.value.tracked).toBe(false);
    expect(trackingRepo.getOpenEvents()).toHaveLength(0);
  });

  it("filters bot — crawler", async () => {
    await trackingRepo.save(makeRecord());

    const result = await useCase.execute({
      token: VALID_TOKEN,
      userAgent: "some-crawler/1.0",
    });

    expect(result.isRight()).toBe(true);
    expect(result.value.tracked).toBe(false);
  });

  it("filters proxy — Apple iCloud Privacy Relay (apple in UA)", async () => {
    await trackingRepo.save(makeRecord());

    const result = await useCase.execute({
      token: VALID_TOKEN,
      userAgent: "Apple Mail Privacy Protection / apple-icloud-proxy",
    });

    expect(result.isRight()).toBe(true);
    expect(result.value.tracked).toBe(false);
  });

  it("filters proxy — AdsBot", async () => {
    await trackingRepo.save(makeRecord());

    const result = await useCase.execute({
      token: VALID_TOKEN,
      userAgent: "AdsBot-Google (+http://www.google.com/adsbot.html)",
    });

    expect(result.isRight()).toBe(true);
    expect(result.value.tracked).toBe(false);
  });

  it("filters spider user agent", async () => {
    await trackingRepo.save(makeRecord());

    const result = await useCase.execute({
      token: VALID_TOKEN,
      userAgent: "spiderbot/1.0",
    });

    expect(result.isRight()).toBe(true);
    expect(result.value.tracked).toBe(false);
  });

  it("does not filter legitimate human browser UA", async () => {
    await trackingRepo.save(makeRecord());

    const result = await useCase.execute({
      token: VALID_TOKEN,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      ip: "93.184.216.34",
    });

    expect(result.isRight()).toBe(true);
    expect(result.value.tracked).toBe(true);
  });

  it("handles missing userAgent gracefully", async () => {
    await trackingRepo.save(makeRecord());

    const result = await useCase.execute({ token: VALID_TOKEN });

    expect(result.isRight()).toBe(true);
    // Empty UA is not bot — should track
    expect(result.value.tracked).toBe(true);
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
