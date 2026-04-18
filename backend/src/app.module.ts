import { Module } from "@nestjs/common";
import { AuthModule } from "./infra/auth/auth.module";
import { DatabaseModule } from "./infra/database/database.module";
import { HealthController } from "./infra/controllers/health.controller";
import { CampaignsModule } from "./domain/campaigns/campaigns.module";
import { ContactsModule } from "./domain/contacts/contacts.module";
import { LeadsModule } from "./domain/leads/leads.module";
import { OrganizationsModule } from "./domain/organizations/organizations.module";
import { PartnersModule } from "./domain/partners/partners.module";
import { DealsModule } from "./domain/deals/deals.module";

@Module({
  imports: [DatabaseModule, AuthModule, CampaignsModule, ContactsModule, LeadsModule, OrganizationsModule, PartnersModule, DealsModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
