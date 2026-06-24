import { describe, it, expect, beforeEach, vi } from "vitest";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { Activity } from "@/domain/activities/enterprise/entities/activity";
import { InMemoryActivitiesRepository } from "../../repositories/in-memory-activities.repository";
import { ProcessActivityRemindersUseCase } from "@/domain/activities/application/use-cases/process-activity-reminders.use-case";
import { right } from "@/core/either";
import type { CreateNotificationUseCase } from "@/domain/notifications/application/use-cases/notifications.use-cases";

function makeActivity(over: Partial<Parameters<typeof Activity.create>[0]> = {}, id = "act-1") {
  return Activity.create(
    {
      ownerId: "owner-1",
      type: "call",
      subject: "Ligar para João",
      completed: false,
      meetingNoShow: false,
      emailReplied: false,
      emailOpenCount: 0,
      emailLinkClickCount: 0,
      ...over,
    },
    new UniqueEntityID(id),
  );
}

const NOW = new Date("2026-06-24T11:00:00Z");
const PAST = new Date("2026-06-24T10:59:00Z");
const FUTURE = new Date("2026-06-24T12:00:00Z");

let repo: InMemoryActivitiesRepository;
let createNotification: { execute: ReturnType<typeof vi.fn> };
let useCase: ProcessActivityRemindersUseCase;

beforeEach(() => {
  repo = new InMemoryActivitiesRepository();
  createNotification = { execute: vi.fn().mockResolvedValue(right({} as never)) };
  useCase = new ProcessActivityRemindersUseCase(
    repo,
    createNotification as unknown as CreateNotificationUseCase,
  );
});

describe("ProcessActivityRemindersUseCase", () => {
  it("notifies a due reminder, deep-links to the lead, and stamps remindedAt (no double-fire)", async () => {
    repo.items.push(makeActivity({ remindAt: PAST, leadId: "lead-9" }));

    const r = await useCase.execute({ now: NOW });

    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.reminded).toBe(1);
    expect(createNotification.execute).toHaveBeenCalledTimes(1);

    const arg = createNotification.execute.mock.calls[0][0];
    expect(arg.type).toBe("ACTIVITY_REMINDER");
    expect(arg.userId).toBe("owner-1");
    expect(arg.summary).toBe("Ligar para João");
    expect(JSON.parse(arg.payload).link).toContain("/leads/lead-9");

    expect(repo.items[0].remindedAt).toBeInstanceOf(Date);

    const again = await useCase.execute({ now: NOW });
    expect(again.isRight() && again.value.reminded).toBe(0);
    expect(createNotification.execute).toHaveBeenCalledTimes(1);
  });

  it("does not fire a reminder set in the future", async () => {
    repo.items.push(makeActivity({ remindAt: FUTURE }));
    const r = await useCase.execute({ now: NOW });
    expect(r.isRight() && r.value.reminded).toBe(0);
    expect(createNotification.execute).not.toHaveBeenCalled();
  });

  it("skips completed activities", async () => {
    repo.items.push(makeActivity({ remindAt: PAST, completed: true }));
    const r = await useCase.execute({ now: NOW });
    expect(r.isRight() && r.value.reminded).toBe(0);
  });

  it("falls back to the activity link when there is no lead/org/partner", async () => {
    repo.items.push(makeActivity({ remindAt: PAST }, "act-x"));
    await useCase.execute({ now: NOW });
    const arg = createNotification.execute.mock.calls[0][0];
    expect(JSON.parse(arg.payload).link).toContain("/activities/act-x");
  });
});
