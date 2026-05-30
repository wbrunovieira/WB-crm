import { describe, it, expect } from "vitest";
import { TrackEmailOpenUseCase, TrackEmailClickUseCase } from "@/domain/email-campaigns/application/use-cases/email-tracking.use-cases";

// Fakes inline (objetos simples) para evitar construir entidades reais pesadas.
function makeSend() {
  return {
    openCount: 0,
    openedAt: undefined as Date | undefined,
    clickedAt: undefined as Date | undefined,
    clickData: {} as Record<string, number>,
    markOpened() { this.openCount++; this.openedAt = new Date(2026, 0, 1); },
    markClicked(url?: string) { if (url) this.clickData[url] = (this.clickData[url] ?? 0) + 1; this.clickedAt = new Date(2026, 0, 1); },
  };
}
function makeActivity() {
  return {
    emailOpenedAt: undefined as Date | undefined,
    emailLinkClickedAt: undefined as Date | undefined,
    updated: undefined as Record<string, unknown> | undefined,
    update(data: Record<string, unknown>) { this.updated = data; Object.assign(this, data); },
  };
}

describe("TrackEmailOpenUseCase", () => {
  it("marca aberto, salva o send e sincroniza a activity", async () => {
    const send = makeSend();
    const activity = makeActivity();
    let sendSaved = false, activitySaved = false;
    const sendsRepo = { findById: async () => send, save: async () => { sendSaved = true; } } as never;
    const activitiesRepo = { findByCampaignSendId: async () => activity, save: async () => { activitySaved = true; } } as never;

    await new TrackEmailOpenUseCase(sendsRepo, activitiesRepo).execute("send-1");

    expect(send.openCount).toBe(1);
    expect(sendSaved).toBe(true);
    expect(activitySaved).toBe(true);
    expect(activity.updated).toMatchObject({ emailOpenCount: 1 });
  });

  it("no-op quando o send não existe", async () => {
    let sendSaved = false;
    const sendsRepo = { findById: async () => null, save: async () => { sendSaved = true; } } as never;
    const activitiesRepo = { findByCampaignSendId: async () => null, save: async () => {} } as never;
    await new TrackEmailOpenUseCase(sendsRepo, activitiesRepo).execute("missing");
    expect(sendSaved).toBe(false);
  });

  it("send sem activity vinculada: salva o send, não quebra", async () => {
    const send = makeSend();
    let sendSaved = false;
    const sendsRepo = { findById: async () => send, save: async () => { sendSaved = true; } } as never;
    const activitiesRepo = { findByCampaignSendId: async () => null, save: async () => {} } as never;
    await new TrackEmailOpenUseCase(sendsRepo, activitiesRepo).execute("send-1");
    expect(sendSaved).toBe(true);
  });
});

describe("TrackEmailClickUseCase", () => {
  it("marca clique com a url, salva e sincroniza totalClicks", async () => {
    const send = makeSend();
    const activity = makeActivity();
    const sendsRepo = { findById: async () => send, save: async () => {} } as never;
    const activitiesRepo = { findByCampaignSendId: async () => activity, save: async () => {} } as never;

    await new TrackEmailClickUseCase(sendsRepo, activitiesRepo).execute({ sendId: "s1", url: "https://x.com" });

    expect(send.clickData["https://x.com"]).toBe(1);
    expect(activity.updated).toMatchObject({ emailLinkClickCount: 1 });
  });

  it("no-op quando o send não existe", async () => {
    let sendSaved = false;
    const sendsRepo = { findById: async () => null, save: async () => { sendSaved = true; } } as never;
    const activitiesRepo = { findByCampaignSendId: async () => null, save: async () => {} } as never;
    await new TrackEmailClickUseCase(sendsRepo, activitiesRepo).execute({ sendId: "missing", url: "https://x.com" });
    expect(sendSaved).toBe(false);
  });
});
