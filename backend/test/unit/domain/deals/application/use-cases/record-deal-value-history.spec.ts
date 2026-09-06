/**
 * Alteração de valor (e de status) de um negócio precisa deixar rastro.
 *
 * Motivo: em produção, 5 dos 8 negócios ganhos foram editados DEPOIS de fechados, e hoje isso
 * não deixa registro nenhum — nem quem, nem quando, nem de quanto para quanto. O
 * DealStageHistory guarda mudança de ETAPA, não de valor.
 *
 * Isso passa a importar de verdade com a integração com o financeiro: quando o valor de um
 * contrato diverge do que já foi lançado como contas a receber, a lista de divergências mostra
 * O QUÊ mudou e nunca O PORQUÊ. Sem este histórico não há como reconstruir se foi aditivo,
 * abatimento ou erro de digitação.
 *
 * Registra também won → open, que hoje limpa o closedAt em silêncio — desfazer o fechamento é
 * tão relevante quanto mudar o número.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { UpdateDealUseCase } from "@/domain/deals/application/use-cases/update-deal.use-case";
import { InMemoryDealsRepository } from "../../repositories/in-memory-deals.repository";
import { Deal } from "@/domain/deals/enterprise/entities/deal";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { right } from "@/core/either";

let repo: InMemoryDealsRepository;
let sut: UpdateDealUseCase;
let sincronizados: { id: string; status: string; organizationId: string | null; organizationName: string | null }[];
const OWNER = "user-1";

async function criarNegocio(props: Partial<{ value: number; status: "open" | "won" | "lost" }> = {}) {
  const deal = Deal.create(
    {
      ownerId: OWNER,
      title: "Contrato de teste",
      value: props.value ?? 2500,
      currency: "BRL",
      status: props.status ?? "won",
      stageId: "stage-1",
      organizationId: "org-1",
      closedAt: new Date("2026-08-25T00:00:00.000Z"),
    },
    new UniqueEntityID("deal-1"),
  );
  await repo.save(deal);
  return deal;
}

beforeEach(() => {
  repo = new InMemoryDealsRepository();
  // O validador de posse de parceiro não participa deste comportamento; um stub que sempre
  // aprova mantém o teste focado no histórico.
  sincronizados = [];
  repo.organizationNames.set("org-1", "Gomez Studio");
  const syncFake = {
    execute: async (deal: { id: string; status: string; organizationId: string | null; organizationName: string | null }) => {
      sincronizados.push(deal);
    },
  };
  sut = new UpdateDealUseCase(repo, { validate: async () => right(undefined) } as never, syncFake as never);
});

describe("UpdateDealUseCase — histórico de valor", () => {
  it("registra a alteração de valor com o autor, o antes e o depois", async () => {
    await criarNegocio({ value: 2500 });

    const result = await sut.execute({
      id: "deal-1",
      requesterId: OWNER,
      requesterRole: "admin",
      value: 3000,
    });

    expect(result.isRight()).toBe(true);
    expect(repo.valueHistory).toHaveLength(1);
    expect(repo.valueHistory[0]).toMatchObject({
      dealId: "deal-1",
      fromValue: 2500,
      toValue: 3000,
      changedById: OWNER,
    });
  });

  it("não registra nada quando o valor não muda", async () => {
    await criarNegocio({ value: 2500 });

    await sut.execute({
      id: "deal-1",
      requesterId: OWNER,
      requesterRole: "admin",
      title: "Só mudou o título",
    });

    expect(repo.valueHistory).toHaveLength(0);
  });

  it("registra a reabertura (won → open), que hoje limpa o closedAt sem rastro", async () => {
    await criarNegocio({ status: "won" });

    await sut.execute({
      id: "deal-1",
      requesterId: OWNER,
      requesterRole: "admin",
      status: "open",
    });

    expect(repo.valueHistory).toHaveLength(1);
    expect(repo.valueHistory[0]).toMatchObject({
      dealId: "deal-1",
      fromStatus: "won",
      toStatus: "open",
      changedById: OWNER,
    });
  });

  it("registra uma só entrada quando valor e status mudam juntos", async () => {
    await criarNegocio({ value: 2500, status: "won" });

    await sut.execute({
      id: "deal-1",
      requesterId: OWNER,
      requesterRole: "admin",
      value: 3000,
      status: "open",
    });

    expect(repo.valueHistory).toHaveLength(1);
    expect(repo.valueHistory[0]).toMatchObject({
      fromValue: 2500,
      toValue: 3000,
      fromStatus: "won",
      toStatus: "open",
    });
  });
});

describe("UpdateDealUseCase — disparo para o financeiro", () => {
  it("sincroniza o contrato quando o valor muda", async () => {
    await criarNegocio({ value: 2500 });

    await sut.execute({
      id: "deal-1",
      requesterId: OWNER,
      requesterRole: "admin",
      value: 3000,
    });

    expect(sincronizados).toHaveLength(1);
    expect(sincronizados[0].id).toBe("deal-1");
  });

  it("sincroniza também na reabertura (won → open)", async () => {
    // O caso que um gatilho só-no-won perderia: a venda caiu e o razão precisa saber.
    await criarNegocio({ status: "won" });

    await sut.execute({
      id: "deal-1",
      requesterId: OWNER,
      requesterRole: "admin",
      status: "open",
    });

    expect(sincronizados).toHaveLength(1);
    expect(sincronizados[0].status).toBe("open");
  });

  it("não sincroniza quando a edição é irrelevante para o contrato", async () => {
    await criarNegocio({ value: 2500 });

    await sut.execute({
      id: "deal-1",
      requesterId: OWNER,
      requesterRole: "admin",
      description: "só uma anotação",
    });

    expect(sincronizados).toHaveLength(0);
  });

  it("resolve o NOME da organização — sem ele o sync é descartado em silêncio", async () => {
    // Guarda contra um erro que quase entrou: passar organizationName: null faria o
    // SyncDealToFinanceUseCase pular sempre, e o disparo nunca aconteceria em produção sem
    // nenhum erro aparecer. Todos os outros testes deste bloco continuariam verdes.
    await criarNegocio({ value: 2500 });

    await sut.execute({ id: "deal-1", requesterId: OWNER, requesterRole: "admin", value: 3000 });

    expect(sincronizados[0].organizationId).toBe("org-1");
    expect(sincronizados[0].organizationName).toBe("Gomez Studio");
  });
});
