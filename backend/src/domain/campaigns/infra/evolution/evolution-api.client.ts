import { Injectable, Logger } from "@nestjs/common";
import {
  EvolutionApiPort,
  type SendMediaOptions,
  type SendTextOptions,
  type SendTypingOptions,
} from "../../application/ports/evolution-api.port";

@Injectable()
export class EvolutionApiClient extends EvolutionApiPort {
  private readonly logger = new Logger(EvolutionApiClient.name);

  private get baseUrl(): string {
    return process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
  }

  private get apiKey(): string {
    return process.env.EVOLUTION_API_KEY ?? "";
  }

  private async post(path: string, body: unknown): Promise<void> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Evolution API error ${res.status}: ${text}`);
    }
  }

  async sendText({ instanceName, phone, text }: SendTextOptions): Promise<void> {
    await this.post(`/message/sendText/${instanceName}`, {
      number: phone,
      text,
    });
  }

  async sendMedia({
    instanceName,
    phone,
    mediaUrl,
    mediaType,
    caption,
  }: SendMediaOptions): Promise<void> {
    await this.post(`/message/sendMedia/${instanceName}`, {
      number: phone,
      mediatype: mediaType,
      media: mediaUrl,
      caption,
    });
  }

  async sendTyping({
    instanceName,
    phone,
    durationSeconds,
  }: SendTypingOptions): Promise<void> {
    // Evolution API: sendPresence com recording/typing
    await this.post(`/chat/sendPresence/${instanceName}`, {
      number: phone,
      options: { presence: "composing", delay: durationSeconds * 1_000 },
    });
  }
}
