import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { GoogleTokenRepository, GoogleTokenRecord } from "../application/repositories/google-token.repository";

const SINGLETON_ID = "google-token-singleton";

@Injectable()
export class PrismaGoogleTokenRepository extends GoogleTokenRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findFirst(): Promise<GoogleTokenRecord | null> {
    return this.prisma.googleToken.findFirst() as Promise<GoogleTokenRecord | null>;
  }

  async save(data: Omit<GoogleTokenRecord, "id" | "gmailHistoryId">): Promise<GoogleTokenRecord> {
    return this.prisma.googleToken.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data },
      update: data,
    }) as Promise<GoogleTokenRecord>;
  }

  async delete(): Promise<void> {
    await this.prisma.googleToken.deleteMany();
  }

  async updateHistoryId(historyId: string): Promise<void> {
    await this.prisma.googleToken.updateMany({ data: { gmailHistoryId: historyId } });
  }
}
