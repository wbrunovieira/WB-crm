import { describe, it, expect, vi, beforeEach } from "vitest";

// PrismaClient precisa ser uma classe real para o "extends" do PrismaService funcionar
vi.mock("@prisma/client", () => {
  class PrismaClient {
    $connect = vi.fn().mockResolvedValue(undefined);
    $disconnect = vi.fn().mockResolvedValue(undefined);
  }
  return { PrismaClient };
});

import { PrismaService } from "@/infra/database/prisma.service";

describe("PrismaService", () => {
  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService();
  });

  it("é uma instância de PrismaService", () => {
    expect(service).toBeInstanceOf(PrismaService);
  });

  it("onModuleInit chama $connect", async () => {
    const connectSpy = vi.spyOn(service, "$connect").mockResolvedValue();
    await service.onModuleInit();
    expect(connectSpy).toHaveBeenCalledOnce();
  });

  it("onModuleDestroy chama $disconnect", async () => {
    const disconnectSpy = vi.spyOn(service, "$disconnect").mockResolvedValue();
    await service.onModuleDestroy();
    expect(disconnectSpy).toHaveBeenCalledOnce();
  });
});
