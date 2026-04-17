import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";

@Controller("health")
export class HealthController {
  @Get()
  check() {
    return { ok: true, timestamp: new Date().toISOString() };
  }

  /** Endpoint protegido — útil para verificar que o JWT do CRM é aceito */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return { ok: true, user };
  }
}
