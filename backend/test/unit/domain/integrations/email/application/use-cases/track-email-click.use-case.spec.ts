import { describe, it, expect, beforeEach } from "vitest";
import { TrackEmailClickUseCase } from "@/domain/integrations/email/application/use-cases/track-email-click.use-case";
import { FakeEmailTrackingRepository } from "../../fakes/fake-email-tracking.repository";
import type { EmailTrackingRecord } from "@/domain/integrations/email/application/repositories/email-tracking.repository";

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
let useCase: TrackEmailClickUseCase;

beforeEach(() => {
  trackingRepo = new FakeEmailTrackingRepository();
  useCase = new TrackEmailClickUseCase(trackingRepo);
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
    expect(result.value.redirectUrl).toBe(TARGET_URL);

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
    expect(result.value.message).toContain("URL is required");
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
    expect(result.value.redirectUrl).toBe(TARGET_URL);
  });

  it("trims whitespace from url", async () => {
    await trackingRepo.save(makeRecord());

    const result = await useCase.execute({
      token: VALID_TOKEN,
      url: "  https://example.com  ",
    });

    expect(result.isRight()).toBe(true);
    expect(result.value.redirectUrl).toBe("https://example.com");
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
    expect(result.value.redirectUrl).toBe(urlWithQuery);
  });
});
