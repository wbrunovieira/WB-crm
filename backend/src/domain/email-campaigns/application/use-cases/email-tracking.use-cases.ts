import { Injectable } from "@nestjs/common";
import { EmailCampaignSendsRepository } from "../repositories/email-campaign-sends.repository";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";

/**
 * Registra abertura de email (pixel 1x1) e sincroniza as stats na Activity
 * vinculada. No-op se o send não existir (o controller sempre devolve o pixel).
 */
@Injectable()
export class TrackEmailOpenUseCase {
  constructor(
    private readonly sends: EmailCampaignSendsRepository,
    private readonly activities: ActivitiesRepository,
  ) {}

  async execute(sendId: string): Promise<void> {
    const send = await this.sends.findById(sendId);
    if (!send) return;

    send.markOpened();
    await this.sends.save(send);

    const activity = await this.activities.findByCampaignSendId(sendId);
    if (activity) {
      activity.update({
        emailOpenCount: send.openCount,
        emailOpenedAt: activity.emailOpenedAt ?? send.openedAt,
        emailLastOpenedAt: send.openedAt,
      });
      await this.activities.save(activity);
    }
  }
}

/**
 * Registra clique em link e sincroniza as stats na Activity vinculada.
 * No-op se o send não existir (o controller sempre redireciona).
 */
@Injectable()
export class TrackEmailClickUseCase {
  constructor(
    private readonly sends: EmailCampaignSendsRepository,
    private readonly activities: ActivitiesRepository,
  ) {}

  async execute(input: { sendId: string; url?: string }): Promise<void> {
    const send = await this.sends.findById(input.sendId);
    if (!send) return;

    send.markClicked(input.url || undefined);
    await this.sends.save(send);

    const activity = await this.activities.findByCampaignSendId(input.sendId);
    if (activity) {
      const totalClicks = Object.values(send.clickData).reduce((sum, c) => sum + c, 0);
      activity.update({
        emailLinkClickCount: totalClicks,
        emailLinkClickedAt: activity.emailLinkClickedAt ?? send.clickedAt,
        emailLastLinkClickedAt: send.clickedAt,
      });
      await this.activities.save(activity);
    }
  }
}
