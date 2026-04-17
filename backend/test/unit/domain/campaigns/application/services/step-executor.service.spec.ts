import { describe, it, expect, beforeEach, vi } from "vitest";
import { StepExecutorService } from "@/domain/campaigns/application/services/step-executor.service";
import { AntiBlockService } from "@/domain/campaigns/application/services/anti-block.service";
import type { EvolutionApiPort } from "@/domain/campaigns/application/ports/evolution-api.port";
import { CampaignSend } from "@/domain/campaigns/enterprise/entities/campaign-send";
import { CampaignStep } from "@/domain/campaigns/enterprise/entities/campaign-step";
import { UniqueEntityID } from "@/core/unique-entity-id";

const makeEvolutionPort = (): EvolutionApiPort => ({
  sendText: vi.fn().mockResolvedValue(undefined),
  sendMedia: vi.fn().mockResolvedValue(undefined),
  sendTyping: vi.fn().mockResolvedValue(undefined),
});

const makeSend = (phone = "5511999999999") =>
  CampaignSend.create({ campaignId: "c1", phone, status: "RUNNING", currentStep: 0 });

const makeStep = (overrides: Partial<Parameters<typeof CampaignStep.create>[0]> = {}) =>
  CampaignStep.create(
    { campaignId: "c1", order: 0, type: "TEXT", text: "Olá!", ...overrides },
    new UniqueEntityID(),
  );

describe("StepExecutorService", () => {
  let evolutionPort: EvolutionApiPort;
  let antiBlock: AntiBlockService;
  let svc: StepExecutorService;

  beforeEach(() => {
    evolutionPort = makeEvolutionPort();
    antiBlock = new AntiBlockService();
    antiBlock.wait = vi.fn().mockResolvedValue(undefined);
    svc = new StepExecutorService(evolutionPort, antiBlock);
  });

  it("envia texto para step TEXT", async () => {
    const send = makeSend();
    const step = makeStep({ type: "TEXT", text: "Olá mundo" });
    await svc.execute(send, step, "my-instance");
    expect(evolutionPort.sendText).toHaveBeenCalledWith({
      instanceName: "my-instance",
      phone: "5511999999999",
      text: "Olá mundo",
    });
  });

  it("lança erro se step TEXT não tem texto", async () => {
    const send = makeSend();
    const step = makeStep({ type: "TEXT", text: undefined });
    await expect(svc.execute(send, step, "inst")).rejects.toThrow("Step TEXT sem conteúdo");
  });

  it("envia mídia para step MEDIA", async () => {
    const send = makeSend();
    const step = makeStep({
      type: "MEDIA",
      mediaUrl: "https://example.com/img.jpg",
      mediaType: "image",
      mediaCaption: "Caption",
    });
    await svc.execute(send, step, "inst");
    expect(evolutionPort.sendMedia).toHaveBeenCalledWith({
      instanceName: "inst",
      phone: "5511999999999",
      mediaUrl: "https://example.com/img.jpg",
      mediaType: "image",
      caption: "Caption",
    });
  });

  it("lança erro se step MEDIA não tem URL", async () => {
    const send = makeSend();
    const step = makeStep({ type: "MEDIA", mediaUrl: undefined });
    await expect(svc.execute(send, step, "inst")).rejects.toThrow("Step MEDIA sem mediaUrl");
  });

  it("envia áudio para step AUDIO", async () => {
    const send = makeSend();
    const step = makeStep({ type: "AUDIO", mediaUrl: "https://example.com/audio.mp3" });
    await svc.execute(send, step, "inst");
    expect(evolutionPort.sendMedia).toHaveBeenCalledWith(
      expect.objectContaining({ mediaType: "audio" }),
    );
  });

  it("envia typing para step TYPING e aguarda duração", async () => {
    const send = makeSend();
    const step = makeStep({ type: "TYPING", typingSeconds: 5 });
    await svc.execute(send, step, "inst");
    expect(evolutionPort.sendTyping).toHaveBeenCalledWith({
      instanceName: "inst",
      phone: "5511999999999",
      durationSeconds: 5,
    });
    expect(antiBlock.wait).toHaveBeenCalledWith(5_000);
  });

  it("aguarda apenas delay para step DELAY", async () => {
    const send = makeSend();
    const step = makeStep({ type: "DELAY", delaySeconds: 10 });
    await svc.execute(send, step, "inst");
    expect(antiBlock.wait).toHaveBeenCalledWith(10_000);
    expect(evolutionPort.sendText).not.toHaveBeenCalled();
  });
});
