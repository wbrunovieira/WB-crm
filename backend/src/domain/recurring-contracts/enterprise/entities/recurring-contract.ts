import { AggregateRoot } from "@/core/aggregate-root";
import { UniqueEntityID } from "@/core/unique-entity-id";

export type ContractType = "dominio" | "hospedagem" | "servidor" | "manutencao" | "outro";
export type ContractCycle = "mensal" | "trimestral" | "anual";
export type ContractStatus = "ativo" | "cancelado" | "encerrado";

/** Quantos meses cada ciclo cobre. Serve para somar formatos diferentes numa moeda so. */
const MESES_POR_CICLO: Record<ContractCycle, number> = {
  mensal: 1,
  trimestral: 3,
  anual: 12,
};

/**
 * Tipos que sao repasse por padrao — entra e sai pelo mesmo valor, sem margem.
 *
 * Dominio e o caso: o cliente paga R$40 e a WB paga R$40 ao registro.br (ver as chaves
 * `dominio:<org>:<ano>:in` e `:out` no financeiro). Somar isso como receita faria a
 * recorrencia parecer maior do que e. Para o dominio o que importa e o AVISO: esquecer a
 * renovacao derruba o site do cliente ou perde o dominio (decisao do Bruno, 12/09/2026).
 */
const REPASSE_POR_PADRAO: ReadonlySet<string> = new Set<ContractType>(["dominio"]);

export interface RecurringContractProps {
  organizationId: string;
  ownerId: string;
  type: ContractType;
  label?: string;
  value: number;
  currency: string;
  cycle: ContractCycle;
  nextChargeAt?: Date;
  endsAt?: Date;
  autoRenew: boolean;
  remindDays: number;
  isPassThrough: boolean;
  /**
   * Servico que existe e NUNCA e cobrado, por decisao. Caso real: a hospedagem da Elaine
   * Vieira, irma do Bruno, cortesia permanente.
   *
   * Marcador proprio, nao status, porque um contrato de cortesia esta ATIVO — se fosse status
   * nao daria para expressar "cortesia cancelada". E nao e o mesmo que valor zero: zero sozinho
   * e ambiguo entre "de graca de proposito" e "ninguem preencheu", e essa diferenca decide se
   * alguem no futuro vai cobrar de quem nao deve.
   */
  isCourtesy: boolean;
  /**
   * Evento do qual a cobranca depende para comecar — "publicacao do site", por exemplo.
   *
   * Caso real: The Dark Film. A clausula 7 da proposta WB-TDF-270826 da 12 meses de hospedagem
   * gratuita A PARTIR DA PUBLICACAO, e o site ainda nao foi publicado. A data de renovacao nao
   * esta faltando: ela ainda nao nasceu.
   *
   * Mesma logica do isCourtesy: sem marcador, ausencia de data e ambigua entre "o evento nao
   * aconteceu" e "alguem esqueceu". A primeira nao se corrige inventando data — e sem distinguir,
   * alguem chuta um vencimento.
   */
  startsAfterEvent?: string;
  status: ContractStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class RecurringContract extends AggregateRoot<RecurringContractProps> {
  get organizationId() { return this.props.organizationId; }
  get ownerId()        { return this.props.ownerId; }
  get type()           { return this.props.type; }
  get label()          { return this.props.label; }
  get value()          { return this.props.value; }
  get currency()       { return this.props.currency; }
  get cycle()          { return this.props.cycle; }
  get nextChargeAt()   { return this.props.nextChargeAt; }
  get endsAt()         { return this.props.endsAt; }
  get autoRenew()      { return this.props.autoRenew; }
  get remindDays()     { return this.props.remindDays; }
  get isPassThrough()  { return this.props.isPassThrough; }
  get isCourtesy()     { return this.props.isCourtesy; }
  get startsAfterEvent() { return this.props.startsAfterEvent; }

  /** Contratado, mas a cobranca ainda nao comecou porque depende de um evento. */
  get aguardandoInicio(): boolean { return !!this.props.startsAfterEvent; }
  get status()         { return this.props.status; }
  get notes()          { return this.props.notes; }
  get createdAt()      { return this.props.createdAt; }
  get updatedAt()      { return this.props.updatedAt; }

  /** Valor normalizado por mes. Sem isto nao da para somar R$128/ano com R$235/mes. */
  get monthlyValue(): number {
    // Cobranca que ainda nao comecou nao e receita corrente.
    if (this.aguardandoInicio) return 0;
    return this.props.value / MESES_POR_CICLO[this.props.cycle];
  }

  /**
   * Se o contrato precisa de aviso agora.
   *
   * Renovacao automatica nao avisa: o sistema segue sozinho e nao ha nada a fazer. O aviso
   * existe para o contrato que simplesmente ACABA se ninguem agir.
   *
   * Usa `endsAt` quando existe; senao cai em `nextChargeAt`, porque renovacao anual de dominio
   * nao tem "fim de contrato" — o que existe e a data de cobrar, e e ela que nao pode passar
   * batido.
   */
  precisaAvisar(agora: Date = new Date()): boolean {
    if (this.props.status !== "ativo") return false;
    // Cortesia nao gera cobranca, entao nao ha prazo a avisar.
    if (this.props.isCourtesy) return false;
    // Nem contrato cuja cobranca ainda nao comecou: nao ha vencimento a vencer.
    if (this.aguardandoInicio) return false;
    if (this.props.autoRenew) return false;

    const alvo = this.props.endsAt ?? this.props.nextChargeAt;
    if (!alvo) return false;

    const limite = new Date(agora.getTime() + this.props.remindDays * 86_400_000);
    return alvo <= limite;
  }

  update(fields: Partial<Omit<RecurringContractProps, "createdAt" | "organizationId" | "ownerId">>): void {
    Object.assign(this.props, fields);
    this.props.updatedAt = new Date();
  }

  static create(
    props: Omit<RecurringContractProps, "currency" | "autoRenew" | "remindDays" | "isPassThrough" | "isCourtesy" | "status" | "createdAt" | "updatedAt"> &
      Partial<Pick<RecurringContractProps, "currency" | "autoRenew" | "remindDays" | "isPassThrough" | "isCourtesy" | "status" | "createdAt" | "updatedAt">>,
    id?: UniqueEntityID,
  ): RecurringContract {
    return new RecurringContract(
      {
        ...props,
        currency: props.currency ?? "BRL",
        autoRenew: props.autoRenew ?? true,
        remindDays: props.remindDays ?? 30,
        // O padrao vem do TIPO para ninguem precisar lembrar que dominio e repasse. Marcacao
        // explicita vence: existe dominio revendido com margem, e a regra e padrao, nao trava.
        isPassThrough: props.isPassThrough ?? REPASSE_POR_PADRAO.has(props.type),
        // Nunca por padrao: cortesia e sempre uma decisao explicita de alguem.
        isCourtesy: props.isCourtesy ?? false,
        status: props.status ?? "ativo",
        createdAt: props.createdAt ?? new Date(),
        updatedAt: props.updatedAt ?? new Date(),
      },
      id,
    );
  }
}
