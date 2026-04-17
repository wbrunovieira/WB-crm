import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import { PrismaService } from "@/infra/database/prisma.service";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let db: "ok" | "error" = "ok";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = "error";
    }
    return { ok: db === "ok", db, timestamp: new Date().toISOString() };
  }

  /** Endpoint protegido — útil para verificar que o JWT do CRM é aceito */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return { ok: true, user };
  }
}
