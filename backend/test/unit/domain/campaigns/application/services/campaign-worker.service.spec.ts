import { describe, it, expect, beforeEach, vi } from "vitest";
import { CampaignWorkerService } from "@/infra/scheduled/campaign-worker.service";
import { AntiBlockService } from "@/domain/campaigns/application/services/anti-block.service";
import { StepExecutorService } from "@/domain/campaigns/application/services/step-executor.service";
import { InMemoryCampaignsRepository } from "../../repositories/in-memory-campaigns.repository";
import { InMemoryCampaignSendsRepository } from "../../repositories/in-memory-campaign-sends.repository";
import { Campaign } from "@/domain/campaigns/enterprise/entities/campaign";
import { CampaignSend } from "@/domain/campaigns/enterprise/entities/campaign-send";
import { CampaignStep } from "@/domain/campaigns/enterprise/entities/campaign-step";
import { UniqueEntityID } from "@/core/unique-entity-id";

const makeActiveCampaign = (): Campaign => {
  const c = Campaign.create({
    ownerId: "owner-1",
    name: "Test",
    instanceName: "inst-1",
  });
  const step = CampaignStep.create(
    { campaignId: c.id.toString(), order: 0, type: "TEXT", text: "Olá!" },
    new UniqueEntityID(),
  );
  c.addStep(step);
  c.start(); // DRAFT → ACTIVE
  return c;
};

describe("CampaignWorkerService", () => {
  let campaigns: InMemoryCampaignsRepository;
  let sends: InMemoryCampaignSendsRepository;
  let stepExecutor: StepExecutorService;
  let antiBlock: AntiBlockService;
  let worker: CampaignWorkerService;

  beforeEach(() => {
    campaigns = new InMemoryCampaignsRepository();
    sends = new InMemoryCampaignSendsRepository();
    antiBlock = new AntiBlockService();
    antiBlock.wait = vi.fn().mockResolvedValue(undefined);
    antiBlock.randomDelay = vi.fn().mockReturnValue(3_000);

    stepExecutor = {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as StepExecutorService;

    worker = new CampaignWorkerService(sends, campaigns, stepExecutor, antiBlock);
  });

  it("não faz nada quando não há sends pendentes", async () => {
    await worker.processQueue();
    expect(stepExecutor.execute).not.toHaveBeenCalled();
  });

  it("processa send pendente de campanha ACTIVE", async () => {
    const campaign = makeActiveCampaign();
    await campaigns.save(campaign);

    const send = CampaignSend.create({
      campaignId: campaign.id.toString(),
      phone: "5511999999999",
    });
    await sends.save(send);

    await worker.processQueue();

    const updated = await sends.findById(send.id.toString());
    // Após processar o único step, currentStep avança → não há próximo → DONE
    expect(updated?.status).toBe("DONE");
    expect(stepExecutor.execute).toHaveBeenCalledOnce();
  });

  it("marca send como FAILED se stepExecutor lançar erro", async () => {
    (stepExecutor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("falha API"),
    );

    const campaign = makeActiveCampaign();
    await campaigns.save(campaign);

    const send = CampaignSend.create({ campaignId: campaign.id.toString(), phone: "5511999999999" });
    await sends.save(send);

    await worker.processQueue();

    const updated = await sends.findById(send.id.toString());
    expect(updated?.status).toBe("FAILED");
    expect(updated?.errorMessage).toContain("falha API");
  });

  it("não processa send de campanha PAUSED", async () => {
    const campaign = makeActiveCampaign();
    campaign.pause(); // ACTIVE → PAUSED
    await campaigns.save(campaign);

    const send = CampaignSend.create({
      campaignId: campaign.id.toString(),
      phone: "5511999999999",
    });
    // O in-memory findDueForExecution não filtra por status da campanha,
    // mas o worker deve verificar campaign.status === "ACTIVE"
    await sends.save(send);

    await worker.processQueue();

    const updated = await sends.findById(send.id.toString());
    // O worker deve ter saído sem processar (campaign não está ACTIVE)
    expect(updated?.status).toBe("PENDING");
    expect(stepExecutor.execute).not.toHaveBeenCalled();
  });

  it("avança currentStep e agenda próximo send quando há mais steps", async () => {
    const campaign = Campaign.create({
      ownerId: "owner-1",
      name: "Multi-step",
      instanceName: "inst-1",
    });
    const step0 = CampaignStep.create(
      { campaignId: campaign.id.toString(), order: 0, type: "TEXT", text: "Step 1" },
      new UniqueEntityID(),
    );
    const step1 = CampaignStep.create(
      { campaignId: campaign.id.toString(), order: 1, type: "TEXT", text: "Step 2" },
      new UniqueEntityID(),
    );
    campaign.addStep(step0);
    campaign.addStep(step1);
    campaign.start();
    await campaigns.save(campaign);

    const send = CampaignSend.create({ campaignId: campaign.id.toString(), phone: "5511999999999" });
    await sends.save(send);

    await worker.processQueue();

    const updated = await sends.findById(send.id.toString());
    expect(updated?.currentStep).toBe(1);
    expect(updated?.status).not.toBe("DONE"); // ainda tem step seguinte agendado
    expect(updated?.scheduledAt).toBeDefined();
  });
});
