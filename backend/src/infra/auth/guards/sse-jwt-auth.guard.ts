import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import type { JwtPayload, AuthenticatedUser } from "../jwt.types";

// Guard para endpoints SSE: aceita token via header Authorization OU via ?token= query param.
// EventSource no browser não suporta headers customizados, então o token vem como query param.
@Injectable()
export class SseJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Token não fornecido");
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const user: AuthenticatedUser = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        role: payload.role,
      };
      (request as Request & { user: AuthenticatedUser }).user = user;
    } catch {
      throw new UnauthorizedException("Token inválido ou expirado");
    }

    return true;
  }

  private extractToken(request: Request): string | undefined {
    const auth = request.headers.authorization;
    if (auth?.startsWith("Bearer ")) return auth.slice(7);
    const queryToken = request.query?.token;
    if (typeof queryToken === "string" && queryToken) return queryToken;
    return undefined;
  }
}
