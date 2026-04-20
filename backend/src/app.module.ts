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
import { ActivitiesModule } from "./domain/activities/activities.module";
import { PipelinesModule } from "./domain/pipelines/pipelines.module";
import { AdminModule } from "./domain/admin/admin.module";
import { SharedEntitiesModule } from "./domain/shared-entities/shared-entities.module";
import { GoToModule } from "./domain/integrations/goto/goto.module";
import { WhatsAppModule } from "./domain/integrations/whatsapp/whatsapp.module";
import { EmailModule } from "./domain/integrations/email/email.module";
import { MeetModule } from "./domain/integrations/meet/meet.module";
import { LeadResearchModule } from "./domain/integrations/lead-research/lead-research.module";
import { LabelsModule } from "./domain/labels/labels.module";
import { CnaeModule } from "./domain/cnae/cnae.module";
import { SectorsModule } from "./domain/sectors/sectors.module";
import { ICPModule } from "./domain/icp/icp.module";
import { TechProfileModule } from "./domain/tech-profile/tech-profile.module";

@Module({
  imports: [DatabaseModule, AuthModule, CampaignsModule, ContactsModule, LeadsModule, OrganizationsModule, PartnersModule, DealsModule, ActivitiesModule, PipelinesModule, AdminModule, SharedEntitiesModule, GoToModule, WhatsAppModule, EmailModule, MeetModule, LeadResearchModule, LabelsModule, CnaeModule, SectorsModule, ICPModule, TechProfileModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
