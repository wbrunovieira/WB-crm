/**
 * Entrada de CNAE vinda de planilha de importação no formato "1234567 - Descrição".
 * Centraliza o parsing/validação de formato que estava inline no use case.
 */
export class CnaeEntry {
  private constructor(
    public readonly code: string,
    public readonly description: string,
  ) {}

  /** Retorna a entrada parseada, ou null se a string não casar com o formato esperado. */
  static parse(raw: string | undefined | null): CnaeEntry | null {
    const match = (raw ?? "").trim().match(/^(\d{4,7})\s*[-–]\s*(.+)$/);
    if (!match) return null;
    return new CnaeEntry(match[1].trim(), match[2].trim());
  }
}
