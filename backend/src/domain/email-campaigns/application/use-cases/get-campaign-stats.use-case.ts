import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { EmailCampaignsRepository } from "../repositories/email-campaigns.repository";
import { EmailCampaignStepsRepository } from "../repositories/email-campaign-steps.repository";
import { EmailCampaignRecipientsRepository } from "../repositories/email-campaign-recipients.repository";
import { EmailCampaignSendsRepository } from "../repositories/email-campaign-sends.repository";

interface StepStats {
  order: number;
  subject: string;
  sent: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickRate: number;
}

export interface Output {
  campaignId: string;
  name: string;
  status: string;
  recipients: {
    total: number;
    pending: number;
    active: number;
    completed: number;
    unsubscribed: number;
    bounced: number;
  };
  totals: {
    sent: number;
    uniqueOpened: number;
    uniqueClicked: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    unsubscribeRate: number;
  };
  steps: StepStats[];
  bySegment: { segment: string; total: number }[];
  byRole: { role: string; total: number }[];
  byRecipientType: { type: string; total: number }[];
}

@Injectable()
export class GetCampaignStatsUseCase {
  constructor(
    private readonly campaigns: EmailCampaignsRepository,
    private readonly steps: EmailCampaignStepsRepository,
    private readonly recipients: EmailCampaignRecipientsRepository,
    private readonly sends: EmailCampaignSendsRepository,
  ) {}

  async execute({ campaignId }: { campaignId: string }): Promise<Either<Error, Output>> {
    const campaign = await this.campaigns.findById(campaignId);
    if (!campaign) return left(new Error("Campaign not found"));

    const [allSteps, allRecipients, sendAggregates] = await Promise.all([
      this.steps.findByCampaign(campaignId),
      this.recipients.findByCampaign(campaignId),
      this.sends.aggregateByCampaign(campaignId),
    ]);

    // ── Recipient status breakdown ──────────────────────────────────────────
    const statusCount = { pending: 0, active: 0, completed: 0, unsubscribed: 0, bounced: 0 };
    const segmentMap = new Map<string, number>();
    const roleMap = new Map<string, number>();
    const typeMap = new Map<string, number>();

    for (const r of allRecipients) {
      const status = r.status.toLowerCase() as keyof typeof statusCount;
      if (status in statusCount) statusCount[status]++;

      const segment = r.customVars?.setor ?? r.customVars?.segment ?? r.role ?? "";
      if (segment) segmentMap.set(segment, (segmentMap.get(segment) ?? 0) + 1);

      const role = r.role ?? "";
      if (role) roleMap.set(role, (roleMap.get(role) ?? 0) + 1);

      typeMap.set(r.recipientType, (typeMap.get(r.recipientType) ?? 0) + 1);
    }

    const total = allRecipients.length;
    const { totalSent, uniqueOpened, uniqueClicked } = sendAggregates;

    // ── Per-step stats ──────────────────────────────────────────────────────
    const stepStats = await Promise.all(
      allSteps.map(async (step) => {
        const counts = await this.sends.countByStep(step.id.toString());
        return {
          order: step.order,
          subject: step.subject,
          ...counts,
          openRate: counts.sent > 0 ? Math.round((counts.opened / counts.sent) * 100) : 0,
          clickRate: counts.sent > 0 ? Math.round((counts.clicked / counts.sent) * 100) : 0,
        };
      }),
    );

    return right({
      campaignId,
      name: campaign.name,
      status: campaign.status,
      recipients: { total, ...statusCount },
      totals: {
        sent: totalSent,
        uniqueOpened,
        uniqueClicked,
        openRate: totalSent > 0 ? Math.round((uniqueOpened / totalSent) * 100) : 0,
        clickRate: totalSent > 0 ? Math.round((uniqueClicked / totalSent) * 100) : 0,
        bounceRate: total > 0 ? Math.round((statusCount.bounced / total) * 100) : 0,
        unsubscribeRate: total > 0 ? Math.round((statusCount.unsubscribed / total) * 100) : 0,
      },
      steps: stepStats,
      bySegment: [...segmentMap.entries()]
        .map(([segment, t]) => ({ segment, total: t }))
        .sort((a, b) => b.total - a.total),
      byRole: [...roleMap.entries()]
        .map(([role, t]) => ({ role, total: t }))
        .sort((a, b) => b.total - a.total),
      byRecipientType: [...typeMap.entries()]
        .map(([type, t]) => ({ type, total: t })),
    });
  }
}
