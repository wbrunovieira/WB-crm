import { Injectable, Logger } from "@nestjs/common";
import { GmailPort, GmailMessage } from "../application/ports/gmail.port";

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
    threadId?: string;
  }): Promise<{ messageId: string; threadId: string }> {
    const { userId, to, subject, bodyHtml, threadId } = params;

    this.logger.log("GmailClient.send", { userId, to, subject });

    // Build RFC 2822 email
    const boundary = `boundary_${Date.now()}`;
    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=utf-8",
      "Content-Transfer-Encoding: quoted-printable",
      "",
      bodyHtml,
      "",
      `--${boundary}--`,
    ];

    const rawEmail = emailLines.join("\r\n");
    const encodedEmail = Buffer.from(rawEmail).toString("base64url");

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
