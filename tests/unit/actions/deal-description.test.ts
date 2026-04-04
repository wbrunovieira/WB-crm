import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../../setup";
import { getServerSession } from "next-auth";

const mockedGetServerSession = vi.mocked(getServerSession);

const mockSession = {
  user: { id: "user-1", email: "user@test.com", name: "User", role: "admin" },
  expires: "2099-01-01",
};

describe("Deal description field", () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(mockSession);
    prismaMock.sharedEntity.findMany.mockResolvedValue([]);
    prismaMock.sharedEntity.findFirst.mockResolvedValue(null);
  });

  it("should accept description when creating a deal", async () => {
    const { createDeal } = await import("@/actions/deals");

    prismaMock.deal.create.mockResolvedValue({
      id: "deal-1",
      title: "Manutencao Servidor",
      value: 1131,
      currency: "BRL",
      status: "open",
      stageId: "stage-1",
      contactId: null,
      organizationId: null,
      expectedCloseDate: null,
      description: "Proposta: Domínio R$60, Hospedagem R$291/ano, Segurança R$780",
      ownerId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    prismaMock.dealStageHistory.create.mockResolvedValue({} as never);

    const result = await createDeal({
      title: "Manutencao Servidor",
      value: 1131,
      currency: "BRL",
      status: "open",
      stageId: "stage-1",
      description: "Proposta: Domínio R$60, Hospedagem R$291/ano, Segurança R$780",
    });

    expect(result.description).toBe("Proposta: Domínio R$60, Hospedagem R$291/ano, Segurança R$780");

    const createCall = prismaMock.deal.create.mock.calls[0][0];
    expect(createCall.data.description).toBe("Proposta: Domínio R$60, Hospedagem R$291/ano, Segurança R$780");
  });

  it("should accept description when updating a deal", async () => {
    const { updateDeal } = await import("@/actions/deals");

    prismaMock.deal.findUnique.mockResolvedValue({
      id: "deal-1",
      title: "Manutencao Servidor",
      stageId: "stage-1",
      ownerId: "user-1",
    } as never);

    prismaMock.deal.update.mockResolvedValue({
      id: "deal-1",
      title: "Manutencao Servidor",
      description: "Cliente fechou apenas R$351",
      ownerId: "user-1",
    } as never);

    const result = await updateDeal("deal-1", {
      title: "Manutencao Servidor",
      value: 351,
      currency: "BRL",
      status: "open",
      stageId: "stage-1",
      description: "Cliente fechou apenas R$351",
    });

    const updateCall = prismaMock.deal.update.mock.calls[0][0];
    expect(updateCall.data.description).toBe("Cliente fechou apenas R$351");
  });

  it("should allow description to be null", async () => {
    const { createDeal } = await import("@/actions/deals");

    prismaMock.deal.create.mockResolvedValue({
      id: "deal-2",
      title: "Deal sem descricao",
      description: null,
      ownerId: "user-1",
    } as never);

    prismaMock.dealStageHistory.create.mockResolvedValue({} as never);

    await createDeal({
      title: "Deal sem descricao",
      value: 100,
      currency: "BRL",
      status: "open",
      stageId: "stage-1",
    });

    const createCall = prismaMock.deal.create.mock.calls[0][0];
    // description should be undefined or null when not provided
    expect(createCall.data.description).toBeUndefined();
  });

  it("should return description in getDealById", async () => {
    const { getDealById } = await import("@/actions/deals");

    prismaMock.deal.findFirst.mockResolvedValue({
      id: "deal-1",
      title: "Manutencao Servidor",
      description: "Proposta completa registrada aqui",
      value: 1131,
      ownerId: "user-1",
    } as never);

    const deal = await getDealById("deal-1");

    expect(deal).toBeDefined();
    expect(deal!.description).toBe("Proposta completa registrada aqui");
  });
});
