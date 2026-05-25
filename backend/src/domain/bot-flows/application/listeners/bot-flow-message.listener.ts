import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { ProcessBotFlowMessageUseCase } from "../use-cases/process-bot-flow-message.use-case";

export interface WhatsAppMessageReceivedEvent {
  instanceName: string;
  phone: string;
  text: string;
  ownerId: string;
  pushName?: string;
}

@Injectable()
export class BotFlowMessageListener {
  private readonly logger = new Logger(BotFlowMessageListener.name);

  constructor(private readonly process: ProcessBotFlowMessageUseCase) {}

  @OnEvent("whatsapp.message.received")
  async handle(event: WhatsAppMessageReceivedEvent) {
    try {
      await this.process.execute(event);
    } catch (err) {
      this.logger.error("BotFlow message processing error", err);
    }
  }
}
