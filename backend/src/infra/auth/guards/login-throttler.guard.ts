import { Injectable, ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { Request } from "express";

/**
 * Rate limit de login por EMAIL, não por IP.
 *
 * Por IP não serve aqui: o backend fica atrás do nginx, e desde que paramos de confiar no
 * X-Forwarded-For (correção do bypass C2) todos os logins parecem vir do mesmo IP — um
 * limite por IP travaria todos os usuários juntos. Por email é mais robusto E mais certo:
 * limita as tentativas contra UMA conta, não importa de quantos IPs o atacante venha. Esse é
 * o alvo real do brute-force.
 */
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    const email = (req.body as { email?: unknown } | undefined)?.email;
    if (typeof email === "string" && email.length > 0) {
      return `login:${email.toLowerCase()}`;
    }
    // Sem email no corpo não há o que brute-forçar; cai no IP para não deixar buraco.
    return `login:ip:${req.ip ?? "unknown"}`;
  }
}
