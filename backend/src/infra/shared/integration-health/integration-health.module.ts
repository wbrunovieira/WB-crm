import { Global, Module } from "@nestjs/common";
import { DatabaseModule } from "@/infra/database/database.module";
import { NotificationsModule } from "@/domain/notifications/notifications.module";
import { IntegrationHealthService } from "./integration-health.service";

/**
 * Global de proposito: saude de integracao e preocupacao TRANSVERSAL, como log. GoogleOAuthService
 * e provido em varios modulos (atividades, e-mail, meet...) e exigir que cada um importe este
 * modulo espalharia acoplamento sem ganho nenhum — e faria a proxima integracao esquecer.
 */
@Global()
@Module({
  imports: [DatabaseModule, NotificationsModule],
  providers: [IntegrationHealthService],
  exports: [IntegrationHealthService],
})
export class IntegrationHealthModule {}
