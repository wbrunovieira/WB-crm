import { describe, it, expect, beforeEach } from "vitest";
import { CancelScheduledEmailUseCase } from "@/domain/integrations/email/application/use-cases/cancel-scheduled-email.use-case";
import { ListScheduledEmailsUseCase } from "@/domain/integrations/email/application/use-cases/list-scheduled-emails.use-case";
import { InMemoryScheduledEmailSendsRepository } from "../../fakes/in-memory-scheduled-email-sends.repository";
import { ScheduledEmailSend } from "@/domain/integrations/email/enterprise/entities/scheduled-email-send";
import { FakeActivitiesRepository } from "@test/unit/domain/integrations/whatsapp/fakes/fake-activities.repository";

const OWNER = "owner-1";

function makePending(opts: { ownerId?: string; activityId?: string; subject?: string; sendAt?: Date } = {}) {
  return ScheduledEmailSend.create({
    ownerId: opts.ownerId ?? OWNER,
    activityId: opts.activityId ?? null,
    scheduledSendAt: opts.sendAt ?? new Date("2026-07-10T09:00:00Z"),
    to: "x@example.com",
    subject: opts.subject ?? "Follow-up",
    bodyHtml: "<p>oi</p>",
    fromEmail: null,
    threadId: null,
    attachments: [],
    leadId: "lead-1",
    contactId: null,
    contactIds: [],
    organizationId: null,
    dealId: null,
  });
}

let repo: InMemoryScheduledEmailSendsRepository;
let activities: FakeActivitiesRepository;
let cancel: CancelScheduledEmailUseCase;
let list: ListScheduledEmailsUseCase;

beforeEach(() => {
  repo = new InMemoryScheduledEmailSendsRepository();
  activities = new FakeActivitiesRepository();
  cancel = new CancelScheduledEmailUseCase(repo, activities);
  list = new ListScheduledEmailsUseCase(repo);
});

describe("CancelScheduledEmailUseCase", () => {
  it("cancels a pending send owned by the requester", async () => {
    const r = makePending();
    await repo.save(r);

    const result = await cancel.execute({ scheduledEmailId: r.id.toString(), requesterId: OWNER, requesterRole: "sdr" });

    expect(result.isRight()).toBe(true);
    expect((await repo.findById(r.id.toString()))!.status).toBe("CANCELLED");
  });

  it("skips the linked pending activity", async () => {
    const activity = activities.createAndAdd({
      ownerId: OWNER,
      type: "email",
      subject: "Follow-up",
      completed: false,
      scheduledSendAt: new Date("2026-07-10T09:00:00Z"),
      meetingNoShow: false,
      emailReplied: false,
      emailOpenCount: 0,
      emailLinkClickCount: 0,
    });
    const r = makePending({ activityId: activity.id.toString() });
    await repo.save(r);

    await cancel.execute({ scheduledEmailId: r.id.toString(), requesterId: OWNER, requesterRole: "sdr" });

    const updated = await activities.findByIdRaw(activity.id.toString());
    expect(updated!.skippedAt).toBeDefined();
    expect(updated!.scheduledSendAt).toBeUndefined();
  });

  it("returns left when the record does not exist", async () => {
    const result = await cancel.execute({ scheduledEmailId: "nope", requesterId: OWNER, requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
  });

  it("returns left when requester is not owner nor admin", async () => {
    const r = makePending({ ownerId: "someone-else" });
    await repo.save(r);
    const result = await cancel.execute({ scheduledEmailId: r.id.toString(), requesterId: OWNER, requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("Não autorizado");
  });

  it("allows an admin to cancel another owner's send", async () => {
    const r = makePending({ ownerId: "someone-else" });
    await repo.save(r);
    const result = await cancel.execute({ scheduledEmailId: r.id.toString(), requesterId: OWNER, requesterRole: "admin" });
    expect(result.isRight()).toBe(true);
  });

  it("returns left when the record is no longer pending", async () => {
    const r = makePending();
    r.markSent("m", "t");
    await repo.save(r);
    const result = await cancel.execute({ scheduledEmailId: r.id.toString(), requesterId: OWNER, requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("pendentes");
  });
});

describe("ListScheduledEmailsUseCase", () => {
  it("returns only the requester's pending sends, sorted by scheduledSendAt", async () => {
    await repo.save(makePending({ subject: "later", sendAt: new Date("2026-07-20T09:00:00Z") }));
    await repo.save(makePending({ subject: "sooner", sendAt: new Date("2026-07-05T09:00:00Z") }));
    await repo.save(makePending({ ownerId: "other", subject: "not mine" }));

    const result = await list.execute(OWNER);

    expect(result.isRight()).toBe(true);
    const items = result.unwrap().items;
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.subject)).toEqual(["sooner", "later"]);
  });

  it("excludes cancelled and sent records", async () => {
    const cancelled = makePending({ subject: "cancelled" });
    cancelled.markCancelled();
    await repo.save(cancelled);

    const result = await list.execute(OWNER);
    expect(result.unwrap().items).toHaveLength(0);
  });
});
