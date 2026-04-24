import { Injectable, Logger, Inject } from "@nestjs/common";
import { randomUUID } from "crypto";
import { GmailPort, GmailMessage, GmailAttachment, SendAsAlias, CalendarInviteParams } from "../application/ports/gmail.port";
import { GoogleOAuthPort } from "../application/ports/google-oauth.port";

@Injectable()
export class GmailClient extends GmailPort {
  private readonly logger = new Logger(GmailClient.name);

  constructor(
    @Inject(GoogleOAuthPort)
    private readonly googleOAuth: GoogleOAuthPort,
  ) {
    super();
  }

  async send(params: {
    userId: string;
    to: string;
    subject: string;
    bodyHtml: string;
    from?: string;
    replyTo?: string;
    cc?: string;
    threadId?: string;
    attachments?: GmailAttachment[];
  }): Promise<{ messageId: string; threadId: string }> {
    const { userId, to, subject, bodyHtml, from, replyTo, cc, threadId, attachments } = params;

    this.logger.log("GmailClient.send", { userId, to, subject, from });

    const encodedEmail = this.buildMimeMessage({ to, subject, bodyHtml, from, replyTo, cc, threadId, attachments });

    const apiUrl = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
    const token = await this.getAccessToken(userId);

    const body: Record<string, string> = { raw: encodedEmail };
    if (threadId) body.threadId = threadId;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gmail API send error: ${response.status} ${text}`);
    }

    const data = await response.json() as { id: string; threadId: string };
    return { messageId: data.id, threadId: data.threadId };
  }

  async pollHistory(userId: string, historyId: string): Promise<GmailMessage[]> {
    this.logger.log("GmailClient.pollHistory", { userId, historyId });

    const token = await this.getAccessToken(userId);
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${historyId}&historyTypes=messageAdded`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 404) {
      this.logger.warn("GmailClient.pollHistory: historyId expired", { historyId });
      return [];
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gmail History API error: ${response.status} ${text}`);
    }

    const data = await response.json() as {
      history?: Array<{
        messagesAdded?: Array<{ message: { id: string; threadId: string } }>;
      }>;
    };

    const messageIds: string[] = [];
    for (const entry of data.history ?? []) {
      for (const added of entry.messagesAdded ?? []) {
        if (!messageIds.includes(added.message.id)) {
          messageIds.push(added.message.id);
        }
      }
    }

    const messages: GmailMessage[] = [];
    for (const messageId of messageIds) {
      const msg = await this.getMessage(userId, messageId);
      if (msg) messages.push(msg);
    }

    return messages;
  }

  async getProfile(userId: string): Promise<{ emailAddress: string; historyId: string }> {
    const token = await this.getAccessToken(userId);
    const url = "https://gmail.googleapis.com/gmail/v1/users/me/profile";

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gmail profile error: ${response.status} ${text}`);
    }

    const data = await response.json() as { emailAddress: string; historyId: string };
    return { emailAddress: data.emailAddress, historyId: data.historyId };
  }

  async getMessage(userId: string, messageId: string): Promise<GmailMessage | null> {
    const token = await this.getAccessToken(userId);
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 404) return null;

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gmail getMessage error: ${response.status} ${text}`);
    }

    const data = await response.json() as GmailApiMessage;
    return this.parseMessage(data);
  }

  async getSendAsAliases(userId: string): Promise<SendAsAlias[]> {
    const token = await this.getAccessToken(userId);
    const url = "https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs";

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gmail sendAs API error: ${response.status} ${text}`);
    }

    const data = await response.json() as {
      sendAs: Array<{
        sendAsEmail: string;
        displayName?: string;
        isDefault?: boolean;
        isPrimary?: boolean;
        verificationStatus?: string;
      }>;
    };

    return (data.sendAs ?? []).map((a) => ({
      email: a.sendAsEmail,
      displayName: a.displayName ?? "",
      isDefault: a.isDefault ?? false,
      isPrimary: a.isPrimary ?? false,
    }));
  }

  async sendCalendarInvite(params: CalendarInviteParams): Promise<void> {
    const {
      userId, to, subject, bodyHtml, from, organizerEmail,
      attendeeEmails, startAt, endAt, title, description,
      googleEventId, meetLink,
    } = params;

    const uid = googleEventId ?? randomUUID();
    // UTC format: DTSTART:20260424T173100Z — TZID prefix with Z suffix is invalid iCal
    const dtFormat = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

    const attendeeLines = attendeeEmails
      .map((e) => `ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${e}`)
      .join("\r\n");

    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//WB CRM//EN",
      "METHOD:REQUEST",
      "BEGIN:VEVENT",
      `DTSTART:${dtFormat(startAt)}`,
      `DTEND:${dtFormat(endAt)}`,
      `SUMMARY:${title}`,
      description ? `DESCRIPTION:${description.replace(/\n/g, "\\n")}` : "",
      `ORGANIZER;CN=${from}:mailto:${organizerEmail}`,
      attendeeLines,
      `UID:${uid}@wbcrm`,
      meetLink ? `LOCATION:${meetLink}` : "",
      "STATUS:CONFIRMED",
      "SEQUENCE:0",
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");

    // Top-level multipart/alternative so Gmail shows Accept/Decline RSVP buttons.
    // Wrapping in multipart/mixed makes the calendar appear as attachment with no RSVP UI.
    const boundary = `wbcrm_alt_${randomUUID().replace(/-/g, "")}`;

    const htmlB64 = Buffer.from(bodyHtml).toString("base64");

    const mime = [
      `To: ${to}`,
      `From: ${from}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=utf-8",
      "Content-Transfer-Encoding: base64",
      "",
      htmlB64,
      "",
      `--${boundary}`,
      // 7bit (plain text) required — Gmail does not parse base64-encoded iCal for RSVP buttons
      "Content-Type: text/calendar; charset=utf-8; method=REQUEST",
      "Content-Transfer-Encoding: 7bit",
      "",
      icsLines,
      "",
      `--${boundary}--`,
    ].join("\r\n");

    const raw = Buffer.from(mime).toString("base64url");
    const token = await this.getAccessToken(userId);

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gmail calendar invite send error: ${response.status} ${text}`);
    }
  }

  private buildMimeMessage(opts: {
    to: string;
    subject: string;
    bodyHtml: string;
    from?: string;
    replyTo?: string;
    cc?: string;
    threadId?: string;
    attachments?: GmailAttachment[];
  }): string {
    const boundary = `wb_crm_${Date.now()}`;
    const hasAttachments = (opts.attachments ?? []).length > 0;

    const headers = [
      `To: ${opts.to}`,
      `Subject: ${opts.subject}`,
      "MIME-Version: 1.0",
    ];

    if (opts.from) {
      headers.push(`From: ${opts.from}`);
    }
    if (opts.replyTo) {
      headers.push(`Reply-To: ${opts.replyTo}`);
    }
    if (opts.cc) {
      headers.push(`Cc: ${opts.cc}`);
    }

    let body: string;

    if (!hasAttachments) {
      headers.push("Content-Type: text/html; charset=utf-8");
      headers.push("Content-Transfer-Encoding: base64");
      body = headers.join("\r\n") + "\r\n\r\n" + Buffer.from(opts.bodyHtml).toString("base64");
    } else {
      headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      const parts: string[] = [
        `--${boundary}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${Buffer.from(opts.bodyHtml).toString("base64")}`,
      ];
      for (const att of opts.attachments!) {
        parts.push(
          `--${boundary}\r\nContent-Type: ${att.mimeType}\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="${att.filename}"\r\n\r\n${att.data}`,
        );
      }
      body = headers.join("\r\n") + "\r\n\r\n" + parts.join("\r\n") + `\r\n--${boundary}--`;
    }

    return Buffer.from(body).toString("base64url");
  }

  private async getAccessToken(_userId: string): Promise<string> {
    return this.googleOAuth.getValidToken("google-token-singleton");
  }

  private parseMessage(data: GmailApiMessage): GmailMessage {
    const headers = data.payload?.headers ?? [];

    const getHeader = (name: string) =>
      headers.find((h: { name: string; value: string }) =>
        h.name.toLowerCase() === name.toLowerCase(),
      )?.value ?? "";

    const from = getHeader("From");
    const to = getHeader("To");
    const subject = getHeader("Subject");
    const inReplyTo = getHeader("In-Reply-To") || undefined;
    const date = getHeader("Date");

    const bodyText = this.extractBody(data.payload, "text/plain") ?? "";
    const bodyHtml = this.extractBody(data.payload, "text/html") ?? "";

    const receivedAt = date ? new Date(date) : new Date(Number(data.internalDate));

    return {
      messageId: data.id,
      threadId: data.threadId,
      from,
      to,
      subject,
      bodyText,
      bodyHtml,
      receivedAt,
      inReplyTo,
    };
  }

  private extractBody(
    payload: GmailApiPayload | undefined,
    mimeType: string,
  ): string | undefined {
    if (!payload) return undefined;

    if (payload.mimeType === mimeType && payload.body?.data) {
      return Buffer.from(payload.body.data, "base64").toString("utf8");
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        const result = this.extractBody(part, mimeType);
        if (result) return result;
      }
    }

    return undefined;
  }
}

interface GmailApiMessage {
  id: string;
  threadId: string;
  internalDate: string;
  payload?: GmailApiPayload;
}

interface GmailApiPayload {
  mimeType?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: { data?: string };
  parts?: GmailApiPayload[];
}
