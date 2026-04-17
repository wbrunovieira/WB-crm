export interface SendTextOptions {
  instanceName: string;
  phone: string; // E.164 sem "+"
  text: string;
}

export interface SendMediaOptions {
  instanceName: string;
  phone: string;
  mediaUrl: string;
  mediaType: "image" | "video" | "document" | "audio";
  caption?: string;
}

export interface SendTypingOptions {
  instanceName: string;
  phone: string;
  durationSeconds: number;
}

export abstract class EvolutionApiPort {
  abstract sendText(opts: SendTextOptions): Promise<void>;
  abstract sendMedia(opts: SendMediaOptions): Promise<void>;
  abstract sendTyping(opts: SendTypingOptions): Promise<void>;
}
