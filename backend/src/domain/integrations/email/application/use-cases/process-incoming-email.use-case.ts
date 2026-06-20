import { Injectable, Logger } from "@nestjs/common";
import { Either, right, left } from "@/core/either";
import { GmailMessage } from "../ports/gmail.port";
import { EmailMessagesRepository, EmailMessage } from "../repositories/email-messages.repository";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";
import { Activity } from "@/domain/activities/enterprise/entities/activity";
import { ContactsRepository } from "@/domain/contacts/application/repositories/contacts.repository";
import { LeadContactsRepository } from "@/domain/leads/application/repositories/lead-contacts.repository";
import { OrganizationsRepository } from "@/domain/organizations/application/repositories/organizations.repository";
import { EmailCampaignsRepository } from "@/domain/email-campaigns/application/repositories/email-campaigns.repository";
import { EmailCampaignRecipientsRepository } from "@/domain/email-campaigns/application/repositories/email-campaign-recipients.repository";
import { EmailCampaignSendsRepository } from "@/domain/email-campaigns/application/repositories/email-campaign-sends.repository";
import { EmailSuppressionsRepository } from "@/domain/email-campaigns/application/repositories/email-suppressions.repository";
import { EmailSuppression } from "@/domain/email-campaigns/enterprise/entities/email-suppression.entity";
import { CreateNotificationUseCase } from "@/domain/notifications/application/use-cases/notifications.use-cases";
import { EntityLink } from "@/domain/notifications/enterprise/value-objects/entity-link.vo";

export interface ProcessIncomingEmailOutput {
  activityId?: string;
  skipped: boolean;
  bounced?: boolean;
  delayed?: boolean;
}

@Injectable()
export class ProcessIncomingEmailUseCase {
  private readonly logger = new Logger(ProcessIncomingEmailUseCase.name);

  constructor(
    private readonly emailMessagesRepo: EmailMessagesRepository,
    private readonly activitiesRepo: ActivitiesRepository,
    private readonly contacts: ContactsRepository,
    private readonly leadContacts: LeadContactsRepository,
    private readonly organizations: OrganizationsRepository,
    private readonly emailCampaigns: EmailCampaignsRepository,
    private readonly recipients: EmailCampaignRecipientsRepository,
    private readonly sends: EmailCampaignSendsRepository,
    private readonly suppressions: EmailSuppressionsRepository,
    private readonly createNotification: CreateNotificationUseCase,
  ) {}

  async execute(
    message: GmailMessage,
    ownerId: string,
  ): Promise<Either<Error, ProcessIncomingEmailOutput>> {
    try {
      // 1. Idempotency check
      const existing = await this.emailMessagesRepo.findByMessageId(message.messageId);
      if (existing) {
        return right({ skipped: true });
      }

      // 2. Detect bounce messages from mailer-daemon / postmaster
      if (this.isBounceMessage(message.from, message.subject)) {
        const bouncedEmail = this.extractBouncedEmail(message.bodyText) ?? this.extractBouncedEmail(message.bodyHtml);
        if (!bouncedEmail) {
          // An unparseable NDR means a bounce we cannot suppress — the address
          // WILL be retried by future campaigns. Loud log so the format gets
          // added to extractBouncedEmail.
          this.logger.warn("ProcessIncomingEmailUseCase: bounce NDR detected but recipient email could not be extracted", {
            messageId: message.messageId,
            from: message.from,
            subject: message.subject,
            bodySnippet: (message.bodyText ?? message.bodyHtml ?? "").slice(0, 300),
          });
          return right({ skipped: true });
        }

        // Transient delays (Gmail "(Delay)", "problema temporário", DSN 4.x.x) are
        // NOT bounces — the server keeps retrying and may still deliver. Surface them
        // as DELAYED (no suppression, no failed activity). If delivery ultimately
        // fails, a definitive Failure NDR arrives later and flips DELAYED → BOUNCED.
        if (this.isTransientBounce(message.subject, message.bodyText, message.bodyHtml)) {
          await this.handleDelay(bouncedEmail, ownerId);
          this.logger.log("ProcessIncomingEmailUseCase: transient delay NDR — marked DELAYED, not suppressed", {
            messageId: message.messageId,
            email: bouncedEmail,
          });
          return right({ skipped: false, delayed: true });
        }

        await this.handleBounce(bouncedEmail, ownerId);
        // Reconcile 1:1 (non-campaign) outbound sends: the campaign path above only
        // touches campaign_email activities. A user-composed email lives as a plain
        // "email" activity, matched here by the DSN's thread.
        await this.failOutboundEmailActivity(message.threadId, bouncedEmail, ownerId, message.bodyText, message.bodyHtml);
        return right({ skipped: false, bounced: true });
      }

      // 3. Extract sender email (strip display name if present: "Name <email@example.com>")
      const fromEmail = this.extractEmail(message.from);

      // 4. Find matching contact/lead/organization by email (scoped to the mailbox owner)
      let contactId: string | undefined;
      let leadId: string | undefined;
      let organizationId: string | undefined;

      if (fromEmail) {
        contactId = (await this.contacts.findIdByEmailForOwner(fromEmail, ownerId)) ?? undefined;
        if (!contactId) {
          leadId = (await this.leadContacts.findLeadIdByContactEmailForOwner(fromEmail, ownerId)) ?? undefined;
          if (!leadId) {
            organizationId = (await this.organizations.findIdByEmailForOwner(fromEmail, ownerId)) ?? undefined;
          }
        }
      }

      // Skip emails from unknown senders — no contact, lead contact, or organization matched
      if (!contactId && !leadId && !organizationId) {
        return right({ skipped: true });
      }

      // 5. Create Activity of type 'email'
      const subject = message.subject || "(sem assunto)";
      const snippet = message.bodyText?.slice(0, 500) || "";
      const description = snippet ? `${subject}\n\n${snippet}` : subject;

      const activity = Activity.create({
        ownerId,
        type: "email",
        subject: `Email — ${subject}`,
        description,
        completed: true,
        completedAt: message.receivedAt,
        dueDate: message.receivedAt,
        contactId,
        leadId,
        organizationId,
        meetingNoShow: false,
        emailReplied: false,
        emailMessageId: message.messageId,
        emailThreadId: message.threadId,
        emailSubject: subject,
        emailFromAddress: fromEmail,
        emailOpenCount: 0,
        emailLinkClickCount: 0,
      });

      await this.activitiesRepo.save(activity);
      const activityId = activity.id.toString();

      // 6. Create EMAIL_RECEIVED notification linked to the matched entity page
      const link = EntityLink.firstOf([
        { type: "lead", id: leadId },
        { type: "organization", id: organizationId },
        { type: "contact", id: contactId },
      ])?.value;
      const notifResult = await this.createNotification.execute({
        type: "EMAIL_RECEIVED",
        title: `Email recebido — ${subject}`,
        summary: `De: ${message.from}`,
        payload: JSON.stringify({
          activityId,
          fromEmail: message.from,
          receivedToEmail: message.to,
          link,
        }),
        userId: ownerId,
      });
      if (notifResult.isLeft()) {
        this.logger.warn("ProcessIncomingEmailUseCase: failed to create notification", {
          error: notifResult.value.message,
        });
      }

      // 7. Save EmailMessage record
      const emailRecord: EmailMessage = {
        id: activityId, // use same ID for simplicity
        gmailMessageId: message.messageId,
        threadId: message.threadId,
        from: message.from,
        to: message.to,
        subject,
        bodyText: message.bodyText,
        activityId,
        ownerId,
        sentAt: message.receivedAt,
        openCount: 0,
        clickCount: 0,
      };

      await this.emailMessagesRepo.save(emailRecord);

      return right({ activityId, skipped: false });
    } catch (err) {
      this.logger.error("ProcessIncomingEmailUseCase: error", {
        messageId: message.messageId,
        error: err instanceof Error ? err.message : String(err),
      });
      return left(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Marks the bounced email's campaign recipients (owned by `ownerId`) as BOUNCED,
   * fails their linked campaign_email activities, and adds the email to the
   * suppression list.
   */
  private async handleBounce(bouncedEmail: string, ownerId: string): Promise<void> {
    const campaigns = await this.emailCampaigns.findAllByOwner(ownerId);
    const campaignIds = new Set(campaigns.map((c) => c.id.toString()));

    if (campaignIds.size > 0) {
      const recipientsForEmail = (await this.recipients.findByEmail(bouncedEmail)).filter((r) =>
        campaignIds.has(r.campaignId),
      );

      // Mark as BOUNCED (skip already-bounced / unsubscribed / suppressed).
      // SUPPRESSED recipients were never sent (skipped pre-send) — flipping them to
      // BOUNCED would re-inflate the bounce rate with contacts we deliberately skipped.
      // DELAYED is intentionally NOT skipped: a definitive failure must override it.
      for (const recipient of recipientsForEmail) {
        if (
          recipient.status !== "BOUNCED" &&
          recipient.status !== "UNSUBSCRIBED" &&
          recipient.status !== "SUPPRESSED"
        ) {
          recipient.markBounced();
          await this.recipients.save(recipient);
        }
      }

      // Fail the linked campaign_email Activity for every send of these recipients
      for (const recipient of recipientsForEmail) {
        const recipientSends = await this.sends.findByRecipient(recipient.id.toString());
        for (const send of recipientSends) {
          const activity = await this.activitiesRepo.findByCampaignSendId(send.id.toString());
          if (activity && !activity.failedAt) {
            activity.update({
              completed: false,
              completedAt: undefined,
              failedAt: new Date(),
              failReason: "Email retornou (bounce)",
            });
            await this.activitiesRepo.save(activity);
          }
        }
      }
    }

    const alreadySuppressed = await this.suppressions.isEmailSuppressed(bouncedEmail, ownerId);
    if (!alreadySuppressed) {
      await this.suppressions.save(
        EmailSuppression.create({ email: bouncedEmail, ownerId, reason: "bounced" }),
      );
    }
  }

  /**
   * Reconciles a 1:1 (non-campaign) outbound email send with its bounce. The
   * activity is found by the DSN's Gmail thread (Gmail threads the NDR with the
   * original send). Marks it failed, captures the SMTP diagnostic into failReason,
   * and notifies the owner so the failure is visible on the lead/contact page.
   * No-op when no matching outbound activity exists (e.g. pure campaign bounce).
   */
  private async failOutboundEmailActivity(
    threadId: string | undefined,
    bouncedEmail: string,
    ownerId: string,
    bodyText?: string,
    bodyHtml?: string,
  ): Promise<void> {
    if (!threadId) return;

    const activities = await this.activitiesRepo.findOutboundEmailByThreadId(threadId, ownerId);
    if (activities.length === 0) return;

    const diagnostic = this.extractDiagnostic(bodyText, bodyHtml);
    const reason = diagnostic
      ? `Email rejeitado pelo servidor remoto: ${diagnostic}`
      : "Email retornou (bounce)";

    for (const activity of activities) {
      if (activity.failedAt) continue; // don't re-fail / re-notify

      activity.update({ completed: false, completedAt: undefined, failedAt: new Date(), failReason: reason });
      await this.activitiesRepo.save(activity);

      const link = EntityLink.firstOf([
        { type: "lead", id: activity.leadId },
        { type: "organization", id: activity.organizationId },
        { type: "contact", id: activity.contactId },
        { type: "partner", id: activity.partnerId },
      ])?.value;

      const notifResult = await this.createNotification.execute({
        type: "EMAIL_BOUNCED",
        title: `Email não entregue — ${activity.emailSubject ?? activity.subject}`,
        summary: `Para ${bouncedEmail}: ${reason}`,
        payload: JSON.stringify({ activityId: activity.id.toString(), bouncedEmail, reason, link }),
        userId: ownerId,
      });
      if (notifResult.isLeft()) {
        this.logger.warn("ProcessIncomingEmailUseCase: failed to create EMAIL_BOUNCED notification", {
          error: notifResult.value.message,
        });
      }
    }
  }

  /**
   * Pulls the human-readable SMTP failure out of a DSN body: the RFC 3464
   * `Diagnostic-Code: smtp; <text>` first, then any bare `5xx ...` status line.
   * Returns undefined when nothing usable is present.
   */
  private extractDiagnostic(bodyText?: string, bodyHtml?: string): string | undefined {
    const stripped = (bodyHtml ?? "").replace(/<[^>]+>/g, " ");
    const haystack = `${bodyText ?? ""}\n${stripped}`;

    const diag = haystack.match(/Diagnostic-Code:\s*(?:smtp;\s*)?([^\n\r]+)/i);
    if (diag) return diag[1].trim().replace(/\.\s*$/, "");

    const code = haystack.match(/\b(5\d{2}\s+[^\n\r]+)/);
    if (code) return code[1].trim().replace(/\.\s*$/, "");

    return undefined;
  }

  /**
   * Marks the email's campaign recipients (owned by `ownerId`) as DELAYED for a
   * TRANSIENT NDR. Unlike handleBounce: no suppression, and the linked activity is
   * left intact (the send may still complete). Skips terminal states so we never
   * downgrade a real bounce/unsubscribe/suppression back to DELAYED.
   */
  private async handleDelay(email: string, ownerId: string): Promise<void> {
    const campaigns = await this.emailCampaigns.findAllByOwner(ownerId);
    const campaignIds = new Set(campaigns.map((c) => c.id.toString()));
    if (campaignIds.size === 0) return;

    const recipientsForEmail = (await this.recipients.findByEmail(email)).filter((r) =>
      campaignIds.has(r.campaignId),
    );

    for (const recipient of recipientsForEmail) {
      if (
        recipient.status !== "BOUNCED" &&
        recipient.status !== "UNSUBSCRIBED" &&
        recipient.status !== "SUPPRESSED" &&
        recipient.status !== "DELAYED"
      ) {
        recipient.markDelayed();
        await this.recipients.save(recipient);
      }
    }
  }

  private extractEmail(from: string): string | undefined {
    const angleMatch = from.match(/<([^>]+)>/);
    if (angleMatch) return angleMatch[1].trim().toLowerCase();
    const trimmed = from.trim().toLowerCase();
    if (trimmed.includes("@")) return trimmed;
    return undefined;
  }

  private isBounceMessage(from: string, subject?: string): boolean {
    const lower = from.toLowerCase();
    if (
      lower.includes("mailer-daemon") ||
      lower.includes("postmaster@") ||
      lower.includes("mail delivery subsystem")
    ) return true;

    if (subject) {
      const subjectLower = subject.toLowerCase();
      if (
        subjectLower.startsWith("undeliverable:") ||
        subjectLower.includes("mail delivery failed") ||
        subjectLower.includes("returned mail:")
      ) return true;
    }

    return false;
  }

  /**
   * Distinguishes a TEMPORARY delay (server still retrying) from a permanent failure.
   * Returns true for transient NDRs (Gmail "(Delay)", "problema temporário",
   * "tentará novamente", DSN Action: delayed / Status 4.x.x). A definitive permanent
   * marker (Action: failed / Status 5.x.x) always wins, so a real bounce is never
   * mistaken for a delay.
   */
  private isTransientBounce(subject?: string, bodyText?: string, bodyHtml?: string): boolean {
    const stripped = (bodyHtml ?? "").replace(/<[^>]+>/g, " ");
    const haystack = `${subject ?? ""}\n${bodyText ?? ""}\n${stripped}`.toLowerCase();

    // Definitive permanent failure overrides any transient-looking wording.
    if (/action:\s*failed/.test(haystack) || /status:\s*5\.\d{1,3}\.\d{1,3}/.test(haystack)) {
      return false;
    }

    return (
      /\(delay\)/.test(haystack) ||
      /action:\s*delayed/.test(haystack) ||
      /status:\s*4\.\d{1,3}\.\d{1,3}/.test(haystack) ||
      /problema tempor[áa]rio/.test(haystack) ||
      /tentar[áa] novamente/.test(haystack) ||
      /will (?:be )?retr(?:y|ied|ying)/.test(haystack) ||
      /temporarily (?:deferred|delayed|rejected|unavailable)/.test(haystack) ||
      /aviso de atraso/.test(haystack)
    );
  }

  private extractBouncedEmail(body: string | undefined): string | undefined {
    if (!body) return undefined;
    // Strip HTML tags so regex works on both text/plain and text/html bodies
    const bodyText = body.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");

    const emailPattern = "[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}";

    // DSN standard headers (RFC 3464)
    const finalRecipient = bodyText.match(new RegExp(`Final-Recipient:\\s*rfc822;\\s*(${emailPattern})`, "i"));
    if (finalRecipient) return finalRecipient[1].toLowerCase();

    const originalRecipient = bodyText.match(new RegExp(`Original-Recipient:\\s*rfc822;\\s*(${emailPattern})`, "i"));
    if (originalRecipient) return originalRecipient[1].toLowerCase();

    // Gmail EN: "wasn't delivered to email@domain"
    const notDelivered = bodyText.match(new RegExp(`wasn't delivered to\\s+(${emailPattern})`, "i"));
    if (notDelivered) return notDelivered[1].toLowerCase();

    // Microsoft 365: "Your message to email@domain couldn't be delivered" / "could not be delivered"
    const ms365 = bodyText.match(new RegExp(`message to\\s+(${emailPattern})\\s+(?:couldn't|could not) be delivered`, "i"));
    if (ms365) return ms365[1].toLowerCase();

    // Gmail PT-BR: "não foi entregue para email@domain"
    const naoEntregue = bodyText.match(new RegExp(`não foi entregue para\\s+(${emailPattern})`, "i"));
    if (naoEntregue) return naoEntregue[1].toLowerCase();

    // Gmail PT-BR mailbox full: "não foi entregue a email@domain" (uses "a" not "para")
    const naoEntregueA = bodyText.match(new RegExp(`não foi entregue a\\s+(${emailPattern})`, "i"));
    if (naoEntregueA) return naoEntregueA[1].toLowerCase();

    // Gmail PT-BR misconfigured server: "entregar a mensagem a email@domain"
    const entregarA = bodyText.match(new RegExp(`entregar a mensagem a\\s+(${emailPattern})`, "i"));
    if (entregarA) return entregarA[1].toLowerCase();

    // Gmail PT-BR soft/DNS bounce: "entrega da mensagem para email@domain" (inclui "Entrega incompleta" DNS SERVFAIL)
    const entregaPara = bodyText.match(new RegExp(`entrega da mensagem para\\s+(${emailPattern})`, "i"));
    if (entregaPara) return entregaPara[1].toLowerCase();

    // cPanel/Exim: "The following address(es) failed: email@domain"
    const cpanelFailed = bodyText.match(new RegExp(`address(?:es)?\\s+failed[:\\s]+(${emailPattern})`, "i"));
    if (cpanelFailed) return cpanelFailed[1].toLowerCase();

    // Proofpoint: "permanent fatal errors ----- <email@domain" or "fatal errors ... email@domain"
    const proofpoint = bodyText.match(new RegExp(`fatal errors.*?-*\\s*<?(${emailPattern})`, "i"));
    if (proofpoint) return proofpoint[1].toLowerCase();

    // Generic catch-all: "failed ... to/recipient(s): email@domain"
    const failedTo = bodyText.match(new RegExp(`failed.*?(?:to|recipients?)[:\\s]+(${emailPattern})`, "i"));
    if (failedTo) return failedTo[1].toLowerCase();

    return undefined;
  }
}
