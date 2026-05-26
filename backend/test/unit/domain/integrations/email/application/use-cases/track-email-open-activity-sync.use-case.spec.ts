import { describe, it, expect, beforeEach } from "vitest";
import { TrackEmailOpenUseCase } from "@/domain/integrations/email/application/use-cases/track-email-open.use-case";
import { TrackEmailClickUseCase } from "@/domain/integrations/email/application/use-cases/track-email-click.use-case";
import { FakeEmailTrackingRepository } from "../../fakes/fake-email-tracking.repository";
import { InMemoryActivitiesRepository } from "../../../../activities/repositories/in-memory-activities.repository";
import { Activity } from "@/domain/activities/enterprise/entities/activity";
import type { EmailTrackingRecord } from "@/domain/integrations/email/application/repositories/email-tracking.repository";

const TOKEN = "validTrackingToken12345";

function makeTracking(overrides: Partial<EmailTrackingRecord> = {}): EmailTrackingRecord {
  return {
    id: "et-001",
    token: TOKEN,
    type: "open",
    emailMessageId: "em-001",
    ownerId: "owner-001",
    ...overrides,
  };
}

function makeActivity(emailTrackingToken: string) {
  return Activity.create({
    ownerId: "owner-001",
    type: "email",
    subject: "Follow-up email",
    completed: true,
    completedAt: new Date(),
    emailTrackingToken,
    emailOpenCount: 0,
    emailLinkClickCount: 0,
    meetingNoShow: false,
    emailReplied: false,
  });
}

describe("TrackEmailOpenUseCase — activity sync", () => {
  let trackingRepo: FakeEmailTrackingRepository;
  let activitiesRepo: InMemoryActivitiesRepository;
  let sut: TrackEmailOpenUseCase;

  beforeEach(() => {
    trackingRepo = new FakeEmailTrackingRepository();
    activitiesRepo = new InMemoryActivitiesRepository();
    sut = new TrackEmailOpenUseCase(trackingRepo, activitiesRepo);
  });

  it("increments Activity.emailOpenCount when a human opens the email", async () => {
    await trackingRepo.save(makeTracking());
    const activity = makeActivity(TOKEN);
    await activitiesRepo.save(activity);

    await sut.execute({ token: TOKEN, userAgent: "Mozilla/5.0 Chrome/120" });

    const saved = activitiesRepo.items.find((a) => a.emailTrackingToken === TOKEN)!;
    expect(saved.emailOpenCount).toBe(1);
  });

  it("sets Activity.emailOpenedAt on first open", async () => {
    await trackingRepo.save(makeTracking());
    const activity = makeActivity(TOKEN);
    await activitiesRepo.save(activity);

    await sut.execute({ token: TOKEN, userAgent: "Mozilla/5.0 Chrome/120" });

    const saved = activitiesRepo.items.find((a) => a.emailTrackingToken === TOKEN)!;
    expect(saved.emailOpenedAt).toBeInstanceOf(Date);
  });

  it("accumulates emailOpenCount across multiple opens", async () => {
    await trackingRepo.save(makeTracking());
    const activity = makeActivity(TOKEN);
    await activitiesRepo.save(activity);

    await sut.execute({ token: TOKEN, userAgent: "Mozilla/5.0 Chrome/120" });
    await sut.execute({ token: TOKEN, userAgent: "Mozilla/5.0 Chrome/120" });
    await sut.execute({ token: TOKEN, userAgent: "Mozilla/5.0 Chrome/120" });

    const saved = activitiesRepo.items.find((a) => a.emailTrackingToken === TOKEN)!;
    expect(saved.emailOpenCount).toBe(3);
  });

  it("does NOT update Activity when bot opens the email", async () => {
    await trackingRepo.save(makeTracking());
    const activity = makeActivity(TOKEN);
    await activitiesRepo.save(activity);

    await sut.execute({ token: TOKEN, userAgent: "Googlebot/2.1" });

    const saved = activitiesRepo.items.find((a) => a.emailTrackingToken === TOKEN)!;
    expect(saved.emailOpenCount).toBe(0);
    expect(saved.emailOpenedAt).toBeUndefined();
  });

  it("does NOT update Activity when token not found", async () => {
    const activity = makeActivity(TOKEN);
    await activitiesRepo.save(activity);

    await sut.execute({ token: TOKEN, userAgent: "Mozilla/5.0" });

    const saved = activitiesRepo.items.find((a) => a.emailTrackingToken === TOKEN)!;
    expect(saved.emailOpenCount).toBe(0);
  });

  it("does nothing to Activity if no activity has the tracking token", async () => {
    await trackingRepo.save(makeTracking());
    // No activity saved — should not throw

    const result = await sut.execute({ token: TOKEN, userAgent: "Mozilla/5.0 Chrome/120" });

    expect(result.isRight()).toBe(true);
  });
});

describe("TrackEmailClickUseCase — activity sync", () => {
  let trackingRepo: FakeEmailTrackingRepository;
  let activitiesRepo: InMemoryActivitiesRepository;
  let sut: TrackEmailClickUseCase;

  beforeEach(() => {
    trackingRepo = new FakeEmailTrackingRepository();
    activitiesRepo = new InMemoryActivitiesRepository();
    sut = new TrackEmailClickUseCase(trackingRepo, activitiesRepo);
  });

  it("increments Activity.emailLinkClickCount on click", async () => {
    const activity = makeActivity(TOKEN);
    await activitiesRepo.save(activity);

    await sut.execute({ token: TOKEN, url: "https://example.com", userAgent: "Mozilla/5.0" });

    const saved = activitiesRepo.items.find((a) => a.emailTrackingToken === TOKEN)!;
    expect(saved.emailLinkClickCount).toBe(1);
  });

  it("sets Activity.emailLinkClickedAt on first click", async () => {
    const activity = makeActivity(TOKEN);
    await activitiesRepo.save(activity);

    await sut.execute({ token: TOKEN, url: "https://example.com", userAgent: "Mozilla/5.0" });

    const saved = activitiesRepo.items.find((a) => a.emailTrackingToken === TOKEN)!;
    expect(saved.emailLinkClickedAt).toBeInstanceOf(Date);
  });

  it("accumulates emailLinkClickCount across multiple clicks", async () => {
    const activity = makeActivity(TOKEN);
    await activitiesRepo.save(activity);

    await sut.execute({ token: TOKEN, url: "https://example.com" });
    await sut.execute({ token: TOKEN, url: "https://example.com/page2" });

    const saved = activitiesRepo.items.find((a) => a.emailTrackingToken === TOKEN)!;
    expect(saved.emailLinkClickCount).toBe(2);
  });
});
