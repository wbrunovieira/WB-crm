import { Logger } from "@nestjs/common";
import { CreateNotificationUseCase } from "@/domain/notifications/application/use-cases/notifications.use-cases";
import { EmailEngagementContext } from "../ports/email-engagement-read.port";

type EngagementKind = "opened" | "clicked";

/**
 * Creates an in-app notification (which the CreateNotificationUseCase also pushes
 * through the realtime NotificationsEventBus) when a lead engages with a direct
 * email. Best-effort: any failure is logged and swallowed so it never affects the
 * tracking pixel/redirect response.
 */
export async function notifyEmailEngagement(
  createNotification: CreateNotificationUseCase,
  ctx: EmailEngagementContext,
  kind: EngagementKind,
  logger: Logger,
  url?: string,
): Promise<void> {
  try {
    const who = ctx.recipientName?.trim() || "Um contato";
    const subject = ctx.subject?.trim() || "(sem assunto)";
    const title =
      kind === "opened"
        ? `📧 ${who} abriu seu e-mail`
        : `🔗 ${who} clicou em um link do seu e-mail`;

    // Deep-link the notification to the related record (the bell navigates to payload.link)
    const link = ctx.leadId
      ? `/leads/${ctx.leadId}`
      : ctx.organizationId
        ? `/organizations/${ctx.organizationId}`
        : ctx.contactId
          ? `/contacts/${ctx.contactId}`
          : ctx.partnerId
            ? `/partners/${ctx.partnerId}`
            : undefined;

    await createNotification.execute({
      type: kind === "opened" ? "EMAIL_OPENED" : "EMAIL_CLICKED",
      title,
      summary: subject,
      userId: ctx.ownerId,
      payload: JSON.stringify({
        kind,
        activityId: ctx.activityId,
        leadId: ctx.leadId,
        organizationId: ctx.organizationId,
        contactId: ctx.contactId,
        partnerId: ctx.partnerId,
        url,
        link,
      }),
    });
  } catch (err) {
    logger.warn("notifyEmailEngagement: failed to create notification", {
      activityId: ctx.activityId,
      kind,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
