import { describe, it, expect, beforeEach, vi } from "vitest";
import { AntiBlockService } from "@/domain/campaigns/application/services/anti-block.service";

describe("AntiBlockService", () => {
  let svc: AntiBlockService;

  beforeEach(() => {
    svc = new AntiBlockService();
  });

  describe("parseConfig", () => {
    it("retorna config padrão quando não há JSON", () => {
      const cfg = svc.parseConfig(undefined);
      expect(cfg.minDelayMs).toBe(3_000);
      expect(cfg.maxDelayMs).toBe(15_000);
      expect(cfg.maxPerHour).toBe(60);
    });

    it("retorna config padrão quando JSON é inválido", () => {
      const cfg = svc.parseConfig("não é json");
      expect(cfg.minDelayMs).toBe(3_000);
    });

    it("parseia JSON válido corretamente", () => {
      const cfg = svc.parseConfig(JSON.stringify({ minDelayMs: 1000, maxDelayMs: 5000, maxPerHour: 30 }));
      expect(cfg.minDelayMs).toBe(1_000);
      expect(cfg.maxDelayMs).toBe(5_000);
      expect(cfg.maxPerHour).toBe(30);
    });

    it("usa defaults para campos ausentes no JSON", () => {
      const cfg = svc.parseConfig(JSON.stringify({ maxPerHour: 20 }));
      expect(cfg.minDelayMs).toBe(3_000);
      expect(cfg.maxDelayMs).toBe(15_000);
      expect(cfg.maxPerHour).toBe(20);
    });
  });

  describe("randomDelay", () => {
    it("retorna valor dentro do intervalo", () => {
      const cfg = { minDelayMs: 1_000, maxDelayMs: 5_000, maxPerHour: 60 };
      for (let i = 0; i < 20; i++) {
        const delay = svc.randomDelay(cfg);
        expect(delay).toBeGreaterThanOrEqual(1_000);
        expect(delay).toBeLessThan(5_000);
      }
    });

    it("retorna o mínimo quando min === max", () => {
      const cfg = { minDelayMs: 2_000, maxDelayMs: 2_000, maxPerHour: 60 };
      expect(svc.randomDelay(cfg)).toBe(2_000);
    });
  });

  describe("isRateLimited / recordSend", () => {
    it("não está limitado inicialmente", () => {
      const cfg = { minDelayMs: 0, maxDelayMs: 0, maxPerHour: 5 };
      expect(svc.isRateLimited("instance-1", cfg)).toBe(false);
    });

    it("está limitado após atingir maxPerHour envios", () => {
      const cfg = { minDelayMs: 0, maxDelayMs: 0, maxPerHour: 3 };
      svc.recordSend("instance-1");
      svc.recordSend("instance-1");
      svc.recordSend("instance-1");
      expect(svc.isRateLimited("instance-1", cfg)).toBe(true);
    });

    it("instâncias diferentes são independentes", () => {
      const cfg = { minDelayMs: 0, maxDelayMs: 0, maxPerHour: 1 };
      svc.recordSend("instance-A");
      svc.recordSend("instance-A");
      expect(svc.isRateLimited("instance-A", cfg)).toBe(true);
      expect(svc.isRateLimited("instance-B", cfg)).toBe(false);
    });
  });

  describe("wait", () => {
    it("aguarda o tempo especificado", async () => {
      vi.useFakeTimers();
      const promise = svc.wait(500);
      vi.advanceTimersByTime(500);
      await promise;
      vi.useRealTimers();
    });
  });
});
