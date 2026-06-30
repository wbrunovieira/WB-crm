import { describe, it, expect, beforeEach } from "vitest";
import { right } from "@/core/either";
import { ActivitiesController } from "@/infra/controllers/activities.controller";
import { Activity } from "@/domain/activities/enterprise/entities/activity";
import type { CreateActivityInput } from "@/domain/activities/application/use-cases/create-activity.use-case";

// Captures the input the controller forwards to the use cases so we can assert
// how it parsed incoming date strings (the timezone correction).
function makeActivity(input: { remindAt?: Date; dueDate?: Date }) {
  return Activity.create({
    ownerId: "u1",
    type: "call",
    subject: "Ligar",
    completed: false,
    meetingNoShow: false,
    emailReplied: false,
    emailOpenCount: 0,
    emailLinkClickCount: 0,
    remindAt: input.remindAt,
    dueDate: input.dueDate,
  });
}

let captured: CreateActivityInput;
let controller: ActivitiesController;

beforeEach(() => {
  captured = {} as CreateActivityInput;
  const createActivity = {
    execute: async (input: CreateActivityInput) => {
      captured = input;
      return right({ activity: makeActivity(input) });
    },
  };
  const updateActivity = {
    execute: async (input: CreateActivityInput) => {
      captured = input;
      return right({ activity: makeActivity(input) });
    },
  };
  controller = new ActivitiesController(
    null as never, // getActivities
    null as never, // getActivityById
    createActivity as never,
    updateActivity as never,
    null as never, null as never, null as never, null as never,
    null as never, null as never, null as never, null as never, null as never,
  );
});

const user = { id: "u1", role: "sdr" } as never;

describe("ActivitiesController — timezone of incoming dates", () => {
  it("interprets a naive remindAt as São Paulo (UTC-3) on create", async () => {
    await controller.create(
      { type: "call", subject: "Ligar", remindAt: "2026-06-30T16:00:00" } as never,
      user,
    );
    // 16:00 São Paulo = 19:00 UTC (fires at 16:00 local, not 13:00)
    expect(captured.remindAt?.toISOString()).toBe("2026-06-30T19:00:00.000Z");
  });

  it("interprets a naive dueDate as São Paulo on create", async () => {
    await controller.create(
      { type: "call", subject: "Ligar", dueDate: "2026-06-30T09:30:00" } as never,
      user,
    );
    expect(captured.dueDate?.toISOString()).toBe("2026-06-30T12:30:00.000Z");
  });

  it("keeps an explicit-Z remindAt absolute (UI path unchanged)", async () => {
    await controller.create(
      { type: "call", subject: "Ligar", remindAt: "2026-06-30T19:00:00.000Z" } as never,
      user,
    );
    expect(captured.remindAt?.toISOString()).toBe("2026-06-30T19:00:00.000Z");
  });

  it("interprets a naive remindAt as São Paulo on update", async () => {
    await controller.update(
      "act-1",
      { remindAt: "2026-07-01T08:00:00" } as never,
      user,
    );
    expect(captured.remindAt?.toISOString()).toBe("2026-07-01T11:00:00.000Z");
  });
});
