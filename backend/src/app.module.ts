import { Module } from "@nestjs/common";
import { AuthModule } from "./infra/auth/auth.module";
import { DatabaseModule } from "./infra/database/database.module";
import { HealthController } from "./infra/controllers/health.controller";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
