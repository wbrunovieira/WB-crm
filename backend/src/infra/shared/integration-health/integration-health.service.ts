import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { CreateNotificationUseCase } from "@/domain/notifications/application/use-cases/notifications.use-cases";
import { deveNotificar, montarAviso, type Integracao } from "./integration-health";

/**
 * Registra a queda de uma integracao e AVISA — no sino, nao so no log.
 *
 * Existe por causa de duas quedas de 2026: Google fora 19 dias e GoTo fora 39. Nas duas o
 * sistema sabia. No GoTo a tela de admin mostrava "Token expirado" corretamente o tempo todo, e
 * nao adiantou: ninguem abre tela de admin para conferir se esta tudo bem. Informacao que
 * existe e nao e entregue nao informa.
 */
@Injectable()
export class IntegrationHealthService {
  private readonly logger = new Logger(IntegrationHealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly createNotification: CreateNotificationUseCase,
  ) {}

  async registrarQueda(integracao: Integracao, motivo: string): Promise<void> {
    try {
      const agora = new Date();
      const estado = await this.lerEstado(integracao);
      if (!estado) return;

      const diasQuebrado = estado.connectedAt
        ? Math.max(0, Math.round((agora.getTime() - estado.connectedAt.getTime()) / 86_400_000))
        : 0;
      const avisar = deveNotificar(estado.failureNotifiedAt);

      await this.gravarFalha(integracao, motivo, agora, avisar);

      if (!avisar) return;

      const aviso = montarAviso(integracao, diasQuebrado);
      const dono = await this.prisma.user.findFirst({
        where: { role: "admin" },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (!dono) return;

      await this.createNotification.execute({ ...aviso, userId: dono.id });
      this.logger.error(`${aviso.title}: ${aviso.summary}`);
    } catch {
      // Diagnostico nunca pode derrubar o fluxo que ele observa.
    }
  }

  private async lerEstado(integracao: Integracao) {
    if (integracao === "google") {
      const t = await this.prisma.googleToken.findFirst();
      return t ? { connectedAt: t.connectedAt, failureNotifiedAt: t.failureNotifiedAt } : null;
    }
    const t = await this.prisma.integrationToken.findUnique({ where: { provider: integracao } });
    return t ? { connectedAt: t.connectedAt, failureNotifiedAt: t.failureNotifiedAt } : null;
  }

  private async gravarFalha(integracao: Integracao, motivo: string, agora: Date, avisar: boolean) {
    const data = {
      lastFailureAt: agora,
      lastFailureReason: motivo.slice(0, 500),
      ...(avisar ? { failureNotifiedAt: agora } : {}),
    };
    if (integracao === "google") {
      const t = await this.prisma.googleToken.findFirst({ select: { id: true } });
      if (t) await this.prisma.googleToken.update({ where: { id: t.id }, data });
      return;
    }
    await this.prisma.integrationToken.update({ where: { provider: integracao }, data });
  }
}
