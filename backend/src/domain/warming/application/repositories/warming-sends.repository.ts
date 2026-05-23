import { WarmingSend } from "../../enterprise/entities/warming-send.entity";

export abstract class WarmingSendsRepository {
  abstract save(send: WarmingSend): Promise<void>;
  abstract countTodayByAccount(warmingAccountId: string): Promise<number>;
  abstract findRecentByAccount(warmingAccountId: string, limit: number): Promise<WarmingSend[]>;
  abstract findAll(ownerId: string, page: number, pageSize: number): Promise<{ sends: WarmingSend[]; total: number }>;
}
