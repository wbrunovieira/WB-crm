import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { CampaignSendsRepository } from "@/domain/campaigns/application/repositories/campaign-sends.repository";
import { CampaignsRepository } from "@/domain/campaigns/application/repositories/campaigns.repository";
import { StepExecutorService } from "@/domain/campaigns/application/services/step-executor.service";
import { AntiBlockService } from "@/domain/campaigns/application/services/anti-block.service";

const BATCH_SIZE = 10;

@Injectable()
export class CampaignWorkerService {
  private readonly logger = new Logger(CampaignWorkerService.name);

  constructor(
    private readonly sends: CampaignSendsRepository,
    private readonly campaigns: CampaignsRepository,
    private readonly stepExecutor: StepExecutorService,
    private readonly antiBlock: AntiBlockService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async processQueue(): Promise<void> {
    const due = await this.sends.findDueForExecution(BATCH_SIZE);
    if (due.length === 0) return;

    this.logger.log(`Processando ${due.length} envios pendentes`);

    for (const send of due) {
      await this.processSend(send.id.toString());
    }
  }

  private async processSend(sendId: string): Promise<void> {
    const send = await this.sends.findById(sendId);
    if (!send) return;

    const campaign = await this.campaigns.findById(send.campaignId);
    if (!campaign || campaign.status !== "ACTIVE") return;

    const config = this.antiBlock.parseConfig(campaign.antiBlockConfig);

    if (this.antiBlock.isRateLimited(campaign.instanceName, config)) {
      this.logger.warn(
        `Rate limit atingido para instância ${campaign.instanceName}`,
      );
      return;
    }

    send.markRunning();
    await this.sends.save(send);

    try {
      const step = campaign.steps[send.currentStep];
      if (!step) {
        send.markDone();
        await this.sends.save(send);
        return;
      }

      await this.stepExecutor.execute(send, step, campaign.instanceName);
      this.antiBlock.recordSend(campaign.instanceName);

      const nextStep = campaign.steps[send.currentStep + 1];
      if (!nextStep) {
        send.markDone();
      } else {
        const delayMs = this.antiBlock.randomDelay(config);
        const scheduledAt = new Date(Date.now() + delayMs);
        send.advanceStep(scheduledAt);
      }

      await this.sends.save(send);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Falha ao processar send ${sendId}: ${message}`);
      send.markFailed(message);
      await this.sends.save(send);
    }
  }
}
