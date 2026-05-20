import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
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
import { PhoneModule } from "./domain/integrations/phone/phone.module";
import { MetaAdsModule } from "./domain/integrations/meta-ads/meta-ads.module";
import { MeetModule } from "./domain/integrations/meet/meet.module";
import { LeadResearchModule } from "./domain/integrations/lead-research/lead-research.module";
import { LeadDeepResearchModule } from "./domain/integrations/lead-deep-research/lead-deep-research.module";
import { CallAnalysisModule } from "./domain/integrations/call-analysis/call-analysis.module";
import { MeetAnalysisModule } from "./domain/integrations/meet-analysis/meet-analysis.module";
import { GatekeeperAnalysisModule } from "./domain/integrations/gatekeeper-analysis/gatekeeper-analysis.module";
import { TransferAnalysisModule } from "./domain/integrations/transfer-analysis/transfer-analysis.module";
import { ProposalAgentModule } from "./domain/integrations/proposal-agent/proposal-agent.module";
import { LabelsModule } from "./domain/labels/labels.module";
import { CnaeModule } from "./domain/cnae/cnae.module";
import { SectorsModule } from "./domain/sectors/sectors.module";
import { ICPModule } from "./domain/icp/icp.module";
import { TechProfileModule } from "./domain/tech-profile/tech-profile.module";
import { ProductLinksModule } from "./domain/product-links/product-links.module";
import { LeadConversionModule } from "./domain/lead-conversion/lead-conversion.module";
import { LeadDuplicatesModule } from "./domain/lead-duplicates/lead-duplicates.module";
import { OperationsModule } from "./domain/operations/operations.module";
import { CadencesModule } from "./domain/cadences/cadences.module";
import { DisqualificationReasonsModule } from "./domain/disqualification-reasons/disqualification-reasons.module";
import { LeadImportModule } from "./domain/lead-import/lead-import.module";
import { ProposalsModule } from "./domain/proposals/proposals.module";
import { HostingRenewalsModule } from "./domain/hosting-renewals/hosting-renewals.module";
import { NotificationsModule } from "./domain/notifications/notifications.module";
import { DashboardModule } from "./domain/dashboard/dashboard.module";
import { FunnelModule } from "./domain/funnel/funnel.module";

@Module({
  imports: [EventEmitterModule.forRoot(), ScheduleModule.forRoot(), DatabaseModule, AuthModule, CampaignsModule, ContactsModule, LeadsModule, OrganizationsModule, PartnersModule, DealsModule, ActivitiesModule, PipelinesModule, AdminModule, SharedEntitiesModule, GoToModule, WhatsAppModule, EmailModule, PhoneModule, MetaAdsModule, MeetModule, LeadResearchModule, LeadDeepResearchModule, LabelsModule, CnaeModule, SectorsModule, ICPModule, TechProfileModule, ProductLinksModule, LeadConversionModule, LeadDuplicatesModule, OperationsModule, CadencesModule, DisqualificationReasonsModule, LeadImportModule, ProposalsModule, HostingRenewalsModule, NotificationsModule, DashboardModule, FunnelModule, CallAnalysisModule, MeetAnalysisModule, GatekeeperAnalysisModule, TransferAnalysisModule, ProposalAgentModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
