/**
 * Um negócio ganho em cima de um LEAD precisa transformar esse lead em cliente.
 *
 * Motivo (dados de produção, 2026-09-06): dos 13 negócios abertos, 12 estão vinculados a lead
 * e apenas 1 a organização. Fechando como estão, o lead que JÁ COMPROU continua na lista de
 * prospecção e — pior — o negócio segue sem organizationId, o que faz o disparo para o
 * financeiro descartar o contrato em silêncio.
 *
 * A conversão é irreversível na prática (arquiva o lead), então ela só dispara na transição
 * para "won" — nunca em "lost" nem ao reabrir.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { UpdateDealUseCase } from "@/domain/deals/application/use-cases/update-deal.use-case";
import { InMemoryDealsRepository } from "../../repositories/in-memory-deals.repository";
import { Deal } from "@/domain/deals/enterprise/entities/deal";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { right } from "@/core/either";

let repo: InMemoryDealsRepository;
let sut: UpdateDealUseCase;
let sincronizados: { id: string; organizationId: string | null; organizationName: string | null }[];
let converter: { execute: ReturnType<typeof vi.fn> };
const OWNER = "user-1";

async function criarNegocio(
  props: Partial<{ status: "open" | "won" | "lost"; leadId: string | null; organizationId: string | null }> = {},
) {
  const deal = Deal.create(
    {
      ownerId: OWNER,
      title: "Contrato de teste",
      value: 2500,
      currency: "BRL",
      status: props.status ?? "open",
      stageId: "stage-1",
      leadId: props.leadId === undefined ? "lead-1" : props.leadId,
      organizationId: props.organizationId ?? undefined,
    },
    new UniqueEntityID("deal-1"),
  );
  await repo.save(deal);
  return deal;
}

beforeEach(() => {
  repo = new InMemoryDealsRepository();
  repo.organizationNames.set("org-nova", "Acme Tech");
  repo.organizationNames.set("org-1", "Gomez Studio");
  sincronizados = [];
  converter = { execute: vi.fn(async () => "org-nova") };
  const syncFake = {
    execute: async (deal: { id: string; organizationId: string | null; organizationName: string | null }) => {
      sincronizados.push(deal);
    },
  };
  sut = new UpdateDealUseCase(
    repo,
    { validate: async () => right(undefined) } as never,
    syncFake as never,
    converter as never,
  );
});

const ganhar = () =>
  sut.execute({ id: "deal-1", requesterId: OWNER, requesterRole: "admin", status: "won" });

describe("UpdateDealUseCase — lead vira cliente ao ganhar", () => {
  it("converte o lead e vincula a organização ao negócio ganho", async () => {
    await criarNegocio({ status: "open" });

    const result = await ganhar();

    expect(result.isRight()).toBe(true);
    expect(converter.execute).toHaveBeenCalledWith({
      leadId: "lead-1",
      requesterId: OWNER,
      requesterRole: "admin",
    });
    expect(result.unwrap().deal.organizationId).toBe("org-nova");
  });

  it("sincroniza com o financeiro JÁ com a organização recém-criada", async () => {
    // Ordem importa: se o disparo acontecesse antes da conversão, o primeiro envio sairia sem
    // organização — exatamente o descarte silencioso que estamos corrigindo.
    await criarNegocio({ status: "open" });

    await ganhar();

    expect(sincronizados).toHaveLength(1);
    expect(sincronizados[0].organizationId).toBe("org-nova");
    expect(sincronizados[0].organizationName).toBe("Acme Tech");
  });

  it("não converte ao marcar como perdido", async () => {
    await criarNegocio({ status: "open" });

    await sut.execute({ id: "deal-1", requesterId: OWNER, requesterRole: "admin", status: "lost" });

    expect(converter.execute).not.toHaveBeenCalled();
  });

  it("não converte ao reabrir um negócio", async () => {
    await criarNegocio({ status: "won" });

    await sut.execute({ id: "deal-1", requesterId: OWNER, requesterRole: "admin", status: "open" });

    expect(converter.execute).not.toHaveBeenCalled();
  });

  it("não converte quando o negócio já tem organização", async () => {
    await criarNegocio({ status: "open", organizationId: "org-1" });

    await ganhar();

    expect(converter.execute).not.toHaveBeenCalled();
    expect(sincronizados[0].organizationId).toBe("org-1");
  });

  it("não converte quando o negócio não está ligado a lead nenhum", async () => {
    await criarNegocio({ status: "open", leadId: null });

    await ganhar();

    expect(converter.execute).not.toHaveBeenCalled();
  });

  it("não reconverte quando o status já era won e a edição não mexeu nele", async () => {
    await criarNegocio({ status: "won" });

    await sut.execute({ id: "deal-1", requesterId: OWNER, requesterRole: "admin", value: 3000 });

    expect(converter.execute).not.toHaveBeenCalled();
  });

  it("mantém o negócio ganho mesmo quando a conversão falha", async () => {
    // A venda é fato do usuário: perder o fechamento porque a cópia de campos quebrou seria
    // trocar um problema de dado por um problema de receita.
    await criarNegocio({ status: "open" });
    converter.execute.mockResolvedValueOnce(null);

    const result = await ganhar();

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().deal.status).toBe("won");
    expect(result.unwrap().deal.organizationId).toBeUndefined();
  });

  it("respeita a organização informada explicitamente na mesma edição", async () => {
    await criarNegocio({ status: "open" });

    await sut.execute({
      id: "deal-1", requesterId: OWNER, requesterRole: "admin",
      status: "won", organizationId: "org-1",
    });

    expect(converter.execute).not.toHaveBeenCalled();
    expect(sincronizados[0].organizationId).toBe("org-1");
  });
});
