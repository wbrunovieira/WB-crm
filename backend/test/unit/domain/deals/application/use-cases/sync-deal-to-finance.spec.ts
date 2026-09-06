/**
 * Sincronização do contrato com o financeiro.
 *
 * Desenho acordado com o serviço financeiro:
 *  - Dispara em QUALQUER mudança relevante, não só no "won". Se só o won disparasse, uma venda
 *    que cai depois de fechada nunca chegaria lá, e o razão ficaria com previsão de caixa de
 *    uma receita que não vai existir. Previsão fantasma é pior que previsão ausente, porque
 *    passa despercebida justamente por parecer normal.
 *  - Manda o ESTADO COMPLETO do contrato, nunca um delta: o mesmo endpoint serve para criar e
 *    para reenviar depois de alteração, e delta obriga os dois lados a concordarem sobre o que
 *    já aconteceu — que é onde integração apodrece.
 *  - Sem parcelas. Cronograma de pagamento tem vencimento e estado pago/não pago; o CRM não
 *    tem nenhum dos dois. O parcelamento nasce no financeiro, que é onde vive o formulário.
 *  - Leva o updatedAt como carimbo, para o destino descartar entrega fora de ordem.
 *
 * O CRM não interpreta nem filtra: manda o estado como está e quem decide é o financeiro,
 * pela regra dele — lançamento confirmado é intocável, o resto vira divergência reportada.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { SyncDealToFinanceUseCase } from "@/domain/deals/application/use-cases/sync-deal-to-finance.use-case";
import type { FinanceSyncPort, FinanceContractPayload } from "@/domain/deals/application/ports/finance-sync.port";

class FakeFinance implements FinanceSyncPort {
  public enviados: FinanceContractPayload[] = [];
  public falharProxima = false;

  async syncContract(payload: FinanceContractPayload): Promise<void> {
    if (this.falharProxima) throw new Error("financeiro fora do ar");
    this.enviados.push(payload);
  }
}

const DEAL = {
  id: "3e9538d6-8304-4580-aa2d-9f113f2075e7",
  title: "Site + Sistema de Agendamento - Gomez Studio",
  value: 2500,
  currency: "BRL",
  status: "won",
  closedAt: new Date("2026-08-25T15:00:00.000Z"),
  updatedAt: new Date("2026-08-25T15:35:28.620Z"),
  organizationId: "26912ac0-aab7-433e-9524-d36b31df76f9",
  organizationName: "Gomez Studio",
};

let finance: FakeFinance;
let sut: SyncDealToFinanceUseCase;

beforeEach(() => {
  finance = new FakeFinance();
  sut = new SyncDealToFinanceUseCase(finance);
});

describe("SyncDealToFinanceUseCase", () => {
  it("manda o estado completo do contrato, sem parcelas", async () => {
    await sut.execute(DEAL);

    expect(finance.enviados).toHaveLength(1);
    const p = finance.enviados[0];
    expect(p.deal).toMatchObject({
      id: DEAL.id,
      totalValue: 2500,
      currency: "BRL",
      status: "won",
    });
    expect(p.organization).toMatchObject({
      id: DEAL.organizationId,
      name: "Gomez Studio",
    });
    // O parcelamento nasce no financeiro — o CRM não tem o conceito.
    expect(p).not.toHaveProperty("installments");
  });

  it("inclui o updatedAt como carimbo de ordenação", async () => {
    await sut.execute(DEAL);

    expect(finance.enviados[0].deal.updatedAt).toBe(DEAL.updatedAt.toISOString());
  });

  it("dispara também quando o negócio é REABERTO (won → open)", async () => {
    // O caso que o gatilho estreito perderia: venda que cai depois de fechada.
    await sut.execute({ ...DEAL, status: "open", closedAt: null });

    expect(finance.enviados).toHaveLength(1);
    expect(finance.enviados[0].deal.status).toBe("open");
    expect(finance.enviados[0].deal.closedAt).toBeNull();
  });

  it("não dispara para negócio sem organização vinculada", async () => {
    // Sem cliente não há centro de custo a criar; mandar geraria um contrato órfão no razão.
    await sut.execute({ ...DEAL, organizationId: null, organizationName: null });

    expect(finance.enviados).toHaveLength(0);
  });

  it("falha do financeiro não derruba a atualização do negócio", async () => {
    // O disparo é efeito colateral: se o financeiro estiver fora, o CRM não pode recusar a
    // edição do usuário. A divergência é detectada do outro lado, não impedida aqui.
    finance.falharProxima = true;

    await expect(sut.execute(DEAL)).resolves.not.toThrow();
  });
});
