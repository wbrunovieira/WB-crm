import { Injectable, Logger } from "@nestjs/common";
import { FinanceSyncPort, FinanceContractPayload } from "../application/ports/finance-sync.port";

/**
 * Adapter HTTP do financeiro (calendar-finances), no mesmo servidor.
 *
 * Desligado por padrão: sem FINANCE_API_URL configurada, o sync é no-op silencioso. Assim o
 * CRM roda em qualquer ambiente sem exigir o financeiro de pé, e ligar a integração é
 * configuração, não deploy de código.
 */
@Injectable()
export class FinanceHttpClient extends FinanceSyncPort {
  private readonly logger = new Logger(FinanceHttpClient.name);
  private readonly baseUrl = process.env.FINANCE_API_URL ?? "";
  private readonly secret = process.env.FINANCE_API_SECRET ?? "";

  async syncContract(payload: FinanceContractPayload): Promise<void> {
    if (!this.baseUrl) {
      this.logger.debug("FINANCE_API_URL não configurada — sync desligado");
      return;
    }

    const res = await fetch(`${this.baseUrl}/contracts/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.secret ? { "x-webhook-secret": this.secret } : {}),
      },
      body: JSON.stringify(payload),
      // Sem timeout, uma indisponibilidade do financeiro prenderia a requisição do usuário.
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`financeiro respondeu ${res.status}: ${body.slice(0, 200)}`);
    }
  }
}
