import { Injectable, Logger } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { EmailCampaignStepsRepository } from "../repositories/email-campaign-steps.repository";
import { SendCampaignStepUseCase } from "./send-campaign-step.use-case";

const TRACKING_BASE_URL = process.env.BACKEND_URL ?? "https://crm-api.wbdigitalsolutions.com";

/** In-memory lock: campaignIds currently being sent. Exported so controller and GetCampaignProgressUseCase can read it. */
export const sendingInProgress = new Set<string>();

interface Input {
  campaignId: string;
}

interface Output {
  triggered: true;
}

@Injectable()
export class TriggerCampaignSendNowUseCase {
  private readonly logger = new Logger(TriggerCampaignSendNowUseCase.name);

  constructor(
    private readonly steps: EmailCampaignStepsRepository,
    private readonly sendStep: SendCampaignStepUseCase,
  ) {}

  async execute(input: Input): Promise<Either<Error, Output>> {
    const { campaignId } = input;

    if (sendingInProgress.has(campaignId)) {
      return left(new Error("Campaign send already in progress"));
    }

    sendingInProgress.add(campaignId);

    try {
      const allSteps = await this.steps.findByCampaign(campaignId);
      const orderedSteps = [...allSteps].sort((a, b) => a.order - b.order);

      for (const step of orderedSteps) {
        this.logger.log(`TriggerSendNow: campaign ${campaignId} step ${step.order}`);
        const result = await this.sendStep.execute({
          campaignId,
          stepOrder: step.order,
          trackingBaseUrl: TRACKING_BASE_URL,
          delayRange: { min: 8000, max: 25000 },
        });

        if (result.isLeft()) {
          this.logger.warn(
            `TriggerSendNow: campaign ${campaignId} step ${step.order} returned error: ${result.value.message}`,
          );
        } else {
          const { sent, failed, suppressed } = result.value;
          this.logger.log(
            `TriggerSendNow: campaign ${campaignId} step ${step.order} done — sent=${sent} failed=${failed} suppressed=${suppressed}`,
          );
        }
      }

      return right({ triggered: true });
    } finally {
      sendingInProgress.delete(campaignId);
    }
  }
}
