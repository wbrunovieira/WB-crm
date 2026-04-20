import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { LoginUseCase } from "@/domain/auth/application/use-cases/login.use-case";
import { UsersRepository } from "@/domain/auth/application/repositories/users.repository";
import { PrismaUsersRepository } from "@/infra/database/prisma/repositories/auth/prisma-users.repository";
import { AuthController } from "@/infra/controllers/auth.controller";
import { UsersController } from "@/infra/controllers/users.controller";
import { GetUsersUseCase } from "@/domain/auth/application/use-cases/get-users.use-case";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "7d" },
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    JwtAuthGuard,
    LoginUseCase,
    GetUsersUseCase,
    { provide: UsersRepository, useClass: PrismaUsersRepository },
  ],
  exports: [JwtModule, JwtAuthGuard, UsersRepository],
})
export class AuthModule {}
