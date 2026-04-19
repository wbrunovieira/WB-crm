import {
  EvolutionApiPort,
  SendTextResult,
  SendMediaResult,
  DownloadMediaResult,
  CheckWhatsAppResult,
} from "@/domain/integrations/whatsapp/application/ports/evolution-api.port";

export class FakeEvolutionApiPort extends EvolutionApiPort {
  public sentTexts: Array<{ to: string; text: string }> = [];
  public sentMedia: Array<{ opts: Parameters<EvolutionApiPort["sendMedia"]>[0] }> = [];
  public shouldFailDownload = false;
  public shouldFailSend = false;
  public downloadResult: DownloadMediaResult = {
    buffer: Buffer.from("fake-media"),
    mimeType: "audio/ogg",
    fileName: "audio.ogg",
  };
  public nextMessageId = "msg-001";

  async sendText(to: string, text: string): Promise<SendTextResult> {
    if (this.shouldFailSend) throw new Error("sendText failed");
    this.sentTexts.push({ to, text });
    return {
      messageId: this.nextMessageId,
      remoteJid: `${to}@s.whatsapp.net`,
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  async sendMedia(opts: Parameters<EvolutionApiPort["sendMedia"]>[0]): Promise<SendMediaResult> {
    this.sentMedia.push({ opts });
    return {
      messageId: this.nextMessageId,
      remoteJid: `${opts.to}@s.whatsapp.net`,
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  async downloadMedia(
    _payload: Parameters<EvolutionApiPort["downloadMedia"]>[0],
  ): Promise<DownloadMediaResult> {
    if (this.shouldFailDownload) throw new Error("downloadMedia failed");
    return this.downloadResult;
  }

  async checkNumber(_phone: string): Promise<CheckWhatsAppResult> {
    return { exists: true, jid: `${_phone}@s.whatsapp.net`, number: _phone };
  }
}
