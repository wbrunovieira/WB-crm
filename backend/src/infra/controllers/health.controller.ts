import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiProperty } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import { PrismaService } from "@/infra/database/prisma.service";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";

class HealthResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;

  @ApiProperty({ example: "ok", enum: ["ok", "error"] })
  db!: string;

  @ApiProperty({ example: "2025-04-17T12:00:00.000Z" })
  timestamp!: string;
}

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "Health check", description: "Verifica status da aplicação e conexão com banco de dados" })
  @ApiResponse({ status: 200, description: "Status da aplicação", type: HealthResponseDto })
  async check() {
    let db: "ok" | "error" = "ok";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = "error";
    }
    return { ok: db === "ok", db, timestamp: new Date().toISOString() };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Verificar autenticação JWT", description: "Endpoint protegido — confirma que o token JWT do CRM é válido" })
  @ApiResponse({ status: 200, description: "Token válido, retorna dados do usuário" })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  me(@CurrentUser() user: AuthenticatedUser) {
    return { ok: true, user };
  }
}
