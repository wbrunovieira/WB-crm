import { Injectable, Logger } from "@nestjs/common";
import { GmailPort, GmailMessage, GmailAttachment, SendAsAlias } from "../application/ports/gmail.port";

/**
 * Gmail API client.
 *
 * Uses the googleapis package if available.
 * Falls back to stub implementation that throws a descriptive error.
 *
 * To enable: npm install googleapis in the backend package.
 */
@Injectable()
export class GmailClient extends GmailPort {
  private readonly logger = new Logger(GmailClient.name);

  async send(params: {
    userId: string;
    to: string;
    subject: string;
    bodyHtml: string;
    from?: string;
    threadId?: string;
    attachments?: GmailAttachment[];
  }): Promise<{ messageId: string; threadId: string }> {
    const { userId, to, subject, bodyHtml, from, threadId, attachments } = params;

    this.logger.log("GmailClient.send", { userId, to, subject, from });

    const encodedEmail = this.buildMimeMessage({ to, subject, bodyHtml, from, threadId, attachments });

    const apiUrl = `https://gmail.googleapis.com/gmail/v1/users/${userId}/messages/send`;
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
    const url = `https://gmail.googleapis.com/gmail/v1/users/${userId}/history?startHistoryId=${historyId}&historyTypes=messageAdded`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 404) {
      // historyId expired — return empty, caller should reset
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
    const url = `https://gmail.googleapis.com/gmail/v1/users/${userId}/profile`;

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
    const url = `https://gmail.googleapis.com/gmail/v1/users/${userId}/messages/${messageId}?format=full`;

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
    const url = `https://gmail.googleapis.com/gmail/v1/users/${userId}/settings/sendAs`;

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

  private buildMimeMessage(opts: {
    to: string;
    subject: string;
    bodyHtml: string;
    from?: string;
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
    // In production, inject GoogleOAuthPort and call getValidToken
    // For now, throw descriptive error if no token configured
    const token = process.env.GMAIL_ACCESS_TOKEN;
    if (!token) {
      throw new Error(
        "Gmail access token not configured. Set GMAIL_ACCESS_TOKEN env var or configure GoogleOAuthPort.",
      );
    }
    return token;
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
