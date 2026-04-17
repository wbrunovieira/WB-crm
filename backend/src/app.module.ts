import { Module } from "@nestjs/common";
import { AuthModule } from "./infra/auth/auth.module";
import { HealthController } from "./infra/controllers/health.controller";

@Module({
  imports: [AuthModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
