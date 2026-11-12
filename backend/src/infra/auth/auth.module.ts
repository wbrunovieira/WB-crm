import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule } from "@nestjs/throttler";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { SseJwtAuthGuard } from "./guards/sse-jwt-auth.guard";
import { LoginThrottlerGuard } from "./guards/login-throttler.guard";
import { LoginUseCase } from "@/domain/auth/application/use-cases/login.use-case";
import { RegisterUserUseCase } from "@/domain/auth/application/use-cases/register-user.use-case";
import { UsersRepository } from "@/domain/auth/application/repositories/users.repository";
import { OAuthRepository } from "@/domain/auth/application/repositories/oauth.repository";
import {
  StoreGoogleTokensUseCase,
  DisconnectGoogleUseCase,
  StoreGoToTokensUseCase,
} from "@/domain/auth/application/use-cases/oauth.use-cases";
import { GetGoToConnectionStatusUseCase } from "@/domain/auth/application/use-cases/get-goto-connection-status.use-case";
import { PrismaUsersRepository } from "@/infra/database/prisma/repositories/auth/prisma-users.repository";
import { PrismaOAuthRepository } from "@/infra/database/prisma/repositories/auth/prisma-oauth.repository";
import { AuthController } from "@/infra/controllers/auth.controller";
import { UsersController } from "@/infra/controllers/users.controller";
import { GetUsersUseCase } from "@/domain/auth/application/use-cases/get-users.use-case";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "7d" },
    }),
    // 5 tentativas de login por email a cada 60s. Só o /auth/login usa (via LoginThrottlerGuard
    // aplicado no controller) — não é guard global, então webhooks e crons não são limitados.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }]),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    JwtAuthGuard,
    SseJwtAuthGuard,
    LoginThrottlerGuard,
    LoginUseCase,
    RegisterUserUseCase,
    GetUsersUseCase,
    StoreGoogleTokensUseCase,
    DisconnectGoogleUseCase,
    StoreGoToTokensUseCase,
    GetGoToConnectionStatusUseCase,
    { provide: UsersRepository, useClass: PrismaUsersRepository },
    { provide: OAuthRepository, useClass: PrismaOAuthRepository },
  ],
  exports: [JwtModule, JwtAuthGuard, SseJwtAuthGuard, UsersRepository, OAuthRepository],
})
export class AuthModule {}
