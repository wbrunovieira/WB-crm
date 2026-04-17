import { Injectable } from "@nestjs/common";

export interface AntiBlockConfig {
  minDelayMs: number;
  maxDelayMs: number;
  maxPerHour: number;
}

const DEFAULT_CONFIG: AntiBlockConfig = {
  minDelayMs: 3_000,
  maxDelayMs: 15_000,
  maxPerHour: 60,
};

@Injectable()
export class AntiBlockService {
  private sendCounts = new Map<string, { count: number; resetAt: number }>();

  parseConfig(raw?: string): AntiBlockConfig {
    if (!raw) return DEFAULT_CONFIG;
    try {
      const parsed = JSON.parse(raw);
      return {
        minDelayMs: parsed.minDelayMs ?? DEFAULT_CONFIG.minDelayMs,
        maxDelayMs: parsed.maxDelayMs ?? DEFAULT_CONFIG.maxDelayMs,
        maxPerHour: parsed.maxPerHour ?? DEFAULT_CONFIG.maxPerHour,
      };
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  randomDelay(config: AntiBlockConfig): number {
    const range = config.maxDelayMs - config.minDelayMs;
    return config.minDelayMs + Math.floor(Math.random() * range);
  }

  isRateLimited(instanceName: string, config: AntiBlockConfig): boolean {
    const now = Date.now();
    const entry = this.sendCounts.get(instanceName);
    if (!entry || now >= entry.resetAt) {
      return false;
    }
    return entry.count >= config.maxPerHour;
  }

  recordSend(instanceName: string): void {
    const now = Date.now();
    const resetAt = now + 3_600_000; // 1 hour from now
    const entry = this.sendCounts.get(instanceName);
    if (!entry || now >= entry.resetAt) {
      this.sendCounts.set(instanceName, { count: 1, resetAt });
    } else {
      entry.count++;
    }
  }

  /** Espera um delay aleatório dentro do intervalo configurado */
  async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
