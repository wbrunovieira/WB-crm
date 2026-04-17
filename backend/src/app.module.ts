import { Module } from "@nestjs/common";
import { AuthModule } from "./infra/auth/auth.module";
import { DatabaseModule } from "./infra/database/database.module";
import { HealthController } from "./infra/controllers/health.controller";
import { CampaignsModule } from "./domain/campaigns/campaigns.module";

@Module({
  imports: [DatabaseModule, AuthModule, CampaignsModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
