import { Injectable, Logger } from "@nestjs/common";
import type { CampaignSend } from "../../enterprise/entities/campaign-send";
import type { CampaignStep } from "../../enterprise/entities/campaign-step";
import { EvolutionApiPort } from "../ports/evolution-api.port";
import { AntiBlockService } from "./anti-block.service";

@Injectable()
export class StepExecutorService {
  private readonly logger = new Logger(StepExecutorService.name);

  constructor(
    private readonly evolutionApi: EvolutionApiPort,
    private readonly antiBlock: AntiBlockService,
  ) {}

  async execute(
    send: CampaignSend,
    step: CampaignStep,
    instanceName: string,
  ): Promise<void> {
    const phone = send.phone;

    switch (step.type) {
      case "TEXT":
        if (!step.text) throw new Error("Step TEXT sem conteúdo");
        await this.evolutionApi.sendText({ instanceName, phone, text: step.text });
        break;

      case "MEDIA":
        if (!step.mediaUrl) throw new Error("Step MEDIA sem mediaUrl");
        await this.evolutionApi.sendMedia({
          instanceName,
          phone,
          mediaUrl: step.mediaUrl,
          mediaType: this.resolveMediaType(step.mediaType),
          caption: step.mediaCaption,
        });
        break;

      case "AUDIO":
        if (!step.mediaUrl) throw new Error("Step AUDIO sem mediaUrl");
        await this.evolutionApi.sendMedia({
          instanceName,
          phone,
          mediaUrl: step.mediaUrl,
          mediaType: "audio",
        });
        break;

      case "TYPING":
        await this.evolutionApi.sendTyping({
          instanceName,
          phone,
          durationSeconds: step.typingSeconds ?? 3,
        });
        await this.antiBlock.wait((step.typingSeconds ?? 3) * 1_000);
        break;

      case "DELAY":
        await this.antiBlock.wait((step.delaySeconds ?? 1) * 1_000);
        break;

      default:
        this.logger.warn(`Tipo de step desconhecido: ${(step as any).type}`);
    }
  }

  private resolveMediaType(
    raw?: string,
  ): "image" | "video" | "document" | "audio" {
    switch (raw?.toLowerCase()) {
      case "image":    return "image";
      case "video":    return "video";
      case "audio":    return "audio";
      default:         return "document";
    }
  }
}
