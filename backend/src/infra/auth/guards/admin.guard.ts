import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from "@nestjs/common";
import type { Request } from "express";
import type { AuthenticatedUser } from "../jwt.types";

/**
 * Exige papel de admin. Roda DEPOIS do JwtAuthGuard, que já populou request.user —
 * por isso só precisa checar o papel, não reautenticar.
 *
 * Existe porque o admin.controller só tinha JwtAuthGuard: qualquer SDR registrado podia
 * criar, editar e apagar BusinessLines, Products e as 8 TechOptions globais. Aplicado só
 * nas MUTAÇÕES — os GET continuam abertos a qualquer autenticado, porque o fluxo de vendas
 * (AddProductToDealModal) lê produtos e linhas de negócio ao montar um deal.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    if (request.user?.role !== "admin") {
      throw new ForbiddenException("Apenas administradores podem fazer esta alteração");
    }
    return true;
  }
}
