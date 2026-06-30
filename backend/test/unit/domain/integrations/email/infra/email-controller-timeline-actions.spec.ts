import { describe, it, expect, beforeEach } from "vitest";
import { right, left } from "@/core/either";
import { EmailController } from "@/domain/integrations/email/infra/controllers/email.controller";
import { ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";

let cancelCalls: unknown[];
let sendNowCalls: unknown[];
let cancelResult: ReturnType<typeof right> | ReturnType<typeof left>;
let sendNowResult: ReturnType<typeof right> | ReturnType<typeof left>;
let controller: EmailController;

function build() {
  cancelCalls = [];
  sendNowCalls = [];
  cancelResult = right({ id: "s1" });
  sendNowResult = right({ id: "s1" });
  const cancelScheduledEmail = {
    execute: async (input: unknown) => { cancelCalls.push(input); return cancelResult; },
  };
  const sendScheduledEmailNow = {
    execute: async (input: unknown) => { sendNowCalls.push(input); return sendNowResult; },
  };
  controller = new EmailController(
    null as never, // sendEmail
    null as never, // scheduleEmail
    cancelScheduledEmail as never,
    sendScheduledEmailNow as never,
    null as never, // listScheduledEmails
    null as never, null as never, null as never, null as never, null as never,
    null as never, null as never, null as never, null as never, null as never,
    null as never, null as never, null as never,
  );
}

const user = { id: "u1", role: "sdr" } as never;

beforeEach(build);

describe("EmailController — send scheduled now (by activity)", () => {
  it("forwards activityId + requester and returns ok", async () => {
    const res = await controller.sendScheduledNow("act-1", user);
    expect(res).toEqual({ ok: true });
    expect(sendNowCalls[0]).toEqual({ activityId: "act-1", requesterId: "u1", requesterRole: "sdr" });
  });

  it("maps 'não encontrado' to NotFound", async () => {
    sendNowResult = left(new Error("Agendamento não encontrado"));
    await expect(controller.sendScheduledNow("x", user)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("maps 'Não autorizado' to Forbidden", async () => {
    sendNowResult = left(new Error("Não autorizado"));
    await expect(controller.sendScheduledNow("x", user)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("maps other errors to BadRequest", async () => {
    sendNowResult = left(new Error("Gmail send failed"));
    await expect(controller.sendScheduledNow("x", user)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("EmailController — cancel scheduled by activity", () => {
  it("forwards activityId + requester and returns ok", async () => {
    const res = await controller.cancelScheduledByActivity("act-9", user);
    expect(res).toEqual({ ok: true });
    expect(cancelCalls[0]).toEqual({ activityId: "act-9", requesterId: "u1", requesterRole: "sdr" });
  });

  it("maps 'não encontrado' to NotFound", async () => {
    cancelResult = left(new Error("Agendamento não encontrado"));
    await expect(controller.cancelScheduledByActivity("x", user)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("maps 'Não autorizado' to Forbidden", async () => {
    cancelResult = left(new Error("Não autorizado"));
    await expect(controller.cancelScheduledByActivity("x", user)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
