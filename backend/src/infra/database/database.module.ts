import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

/**
 * DatabaseModule é @Global() — basta importar uma vez no AppModule.
 * Todos os outros módulos recebem PrismaService por injeção sem precisar
 * re-importar DatabaseModule.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
