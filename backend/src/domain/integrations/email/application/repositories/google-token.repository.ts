export interface GoogleTokenRecord {
  id: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
  email: string;
  gmailHistoryId: string | null;
  // Diagnostico: a tela precisa poder dizer a VERDADE. Em 25/08/2026 ela exibiu "Conectada"
  // por 19 dias com o token morto, porque so checava se existia registro no banco.
  connectedAt?: Date | null;
  lastRefreshOkAt?: Date | null;
  lastFailureAt?: Date | null;
  lastFailureReason?: string | null;
}

/**
 * SINGLETON model: the system holds a single Google token (id
 * "google-token-singleton"). `findFirst()` returns it and `updateHistoryId()`
 * updates it without a key. If multi-account Gmail is ever introduced, this
 * port must gain a token-id parameter and the schema a uniqueness guard —
 * otherwise updateHistoryId would clobber every row.
 */
export abstract class GoogleTokenRepository {
  abstract findFirst(): Promise<GoogleTokenRecord | null>;
  abstract save(data: Omit<GoogleTokenRecord, "id" | "gmailHistoryId">): Promise<GoogleTokenRecord>;
  abstract delete(): Promise<void>;
  abstract updateHistoryId(historyId: string): Promise<void>;
}
