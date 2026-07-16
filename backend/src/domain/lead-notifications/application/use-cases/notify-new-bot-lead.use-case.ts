import { Injectable, Optional, Logger } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { CreateNotificationUseCase } from "@/domain/notifications/application/use-cases/notifications.use-cases";
import { GmailPort } from "@/domain/integrations/email/application/ports/gmail.port";

const GMAIL_USER = "google-token-singleton";

/** Escape HTML so a scraped lead name can't inject markup into the email body. */
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
/** Strip CR/LF so the name can't inject extra email headers via the subject. */
function sanitizeSubject(s: string): string {
  return s.replace(/[\r\n]+/g, " ").trim();
}

export interface NotifyNewBotLeadInput {
  creatorId: string; // who created the lead (ownerId)
  leadId: string;
  businessName: string;
  botUserId: string; // only leads created by this user trigger a notification
  recipientUserId: string; // bell notification target (the human)
  recipientEmail: string; // email target
}

/**
 * When the Bot Prospector creates a lead, alert the human owner via the in-app
 * bell AND an email. Leads created by anyone else are ignored. Kept out of the
 * Leads module (listens to a domain event) so it can depend on Email/Notifications
 * without a circular import.
 */
@Injectable()
export class NotifyNewBotLeadUseCase {
  private readonly logger = new Logger(NotifyNewBotLeadUseCase.name);

  constructor(
    private readonly createNotification: CreateNotificationUseCase,
    @Optional() private readonly gmail?: GmailPort,
  ) {}

  async execute(input: NotifyNewBotLeadInput): Promise<Either<Error, { notified: boolean }>> {
    if (input.creatorId !== input.botUserId) {
      return right({ notified: false });
    }

    const crmLeadUrl = `https://crm.wbdigitalsolutions.com/leads/${input.leadId}`;

    // In-app bell (primary)
    await this.createNotification.execute({
      type: "LEAD_CREATED",
      title: `Novo lead do Bot: ${input.businessName}`,
      summary: `O Bot Prospector cadastrou "${input.businessName}". Abra para qualificar.`,
      userId: input.recipientUserId,
      payload: JSON.stringify({ leadId: input.leadId, source: "bot" }),
    });

    // Email (non-fatal — the bell already fired)
    if (this.gmail) {
      try {
        await this.gmail.send({
          userId: GMAIL_USER,
          to: input.recipientEmail,
          subject: sanitizeSubject(`Novo lead do Bot: ${input.businessName}`),
          bodyHtml: this.buildEmail(input.businessName, crmLeadUrl),
        });
      } catch (err) {
        this.logger.warn(
          `Falha ao enviar e-mail de novo lead do bot (${input.leadId}): ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return right({ notified: true });
  }

  private buildEmail(businessName: string, url: string): string {
    const safeName = escapeHtml(businessName);
    return `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#792990">Novo lead cadastrado pelo Bot Prospector</h2>
        <p>O bot acabou de criar o lead <strong>${safeName}</strong> no CRM.</p>
        <p><a href="${url}" style="display:inline-block;background:#792990;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Abrir o lead</a></p>
        <p style="color:#666;font-size:13px">Você recebeu este aviso porque um lead foi cadastrado automaticamente.</p>
      </div>`;
  }
}
