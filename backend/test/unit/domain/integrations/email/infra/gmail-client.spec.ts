import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { GmailClient } from "@/domain/integrations/email/infra/gmail.client";
import { FakeGoogleOAuthPort } from "../fakes/fake-google-oauth.port";

const SINGLETON_USER_ID = "google-token-singleton";

let googleOAuth: FakeGoogleOAuthPort;
let client: GmailClient;

beforeEach(() => {
  googleOAuth = new FakeGoogleOAuthPort();
  googleOAuth.returnToken = "live-access-token";
  client = new GmailClient(googleOAuth);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GmailClient — token resolution", () => {
  it("always calls getValidToken with 'google-token-singleton' regardless of userId", async () => {
    const spy = vi.spyOn(googleOAuth, "getValidToken");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ emailAddress: "bruno@wbdigitalsolutions.com", historyId: "12345" }),
    }));

    // Even when called with a CRM user UUID, the token key must be the singleton
    await client.getProfile("crm-user-uuid-abc123");

    expect(spy).toHaveBeenCalledWith("google-token-singleton");
    expect(spy).not.toHaveBeenCalledWith("crm-user-uuid-abc123");
  });

  it("uses the token returned by GoogleOAuthPort as Bearer header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ emailAddress: "bruno@wbdigitalsolutions.com", historyId: "99" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await client.getProfile("any-user-id");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const auth = (init.headers as Record<string, string>)["Authorization"];
    // FakeGoogleOAuthPort returns `${returnToken}-${userId}` — userId here is 'google-token-singleton'
    expect(auth).toBe("Bearer live-access-token-google-token-singleton");
  });

  it("hits users/me in the URL (not users/${userId})", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ emailAddress: "bruno@wbdigitalsolutions.com", historyId: "99" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await client.getProfile(SINGLETON_USER_ID);

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/users/me/");
    expect(url).not.toContain(`/users/${SINGLETON_USER_ID}`);
  });

  it("throws when GoogleOAuthPort fails", async () => {
    googleOAuth.shouldFail = true;

    await expect(client.getProfile(SINGLETON_USER_ID)).rejects.toThrow("OAuth token retrieval failed");
  });
});

describe("GmailClient.getSendAsAliases", () => {
  it("returns mapped aliases from Gmail API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sendAs: [
          { sendAsEmail: "bruno@wbdigitalsolutions.com", displayName: "Bruno", isDefault: true, isPrimary: true },
          { sendAsEmail: "bruno@saltoup.com", displayName: "Bruno Saltoup", isDefault: false, isPrimary: false },
        ],
      }),
    }));

    const aliases = await client.getSendAsAliases(SINGLETON_USER_ID);

    expect(aliases).toHaveLength(2);
    expect(aliases[0].email).toBe("bruno@wbdigitalsolutions.com");
    expect(aliases[1].email).toBe("bruno@saltoup.com");
    expect(aliases[1].displayName).toBe("Bruno Saltoup");
  });

  it("throws when Gmail API returns non-ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    }));

    await expect(client.getSendAsAliases(SINGLETON_USER_ID)).rejects.toThrow("Gmail sendAs API error: 401");
  });
});

describe("GmailClient.send", () => {
  it("sends email and returns messageId + threadId", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "msg-abc", threadId: "thread-xyz" }),
    }));

    const result = await client.send({
      userId: SINGLETON_USER_ID,
      to: "dest@example.com",
      subject: "Test",
      bodyHtml: "<p>Hello</p>",
    });

    expect(result.messageId).toBe("msg-abc");
    expect(result.threadId).toBe("thread-xyz");
  });
});

describe("GmailClient.sendCalendarInvite — MIME structure", () => {
  const START = new Date("2026-04-24T17:31:00Z");
  const END = new Date("2026-04-24T18:31:00Z");

  async function sendAndGetMime(overrides: Partial<Parameters<GmailClient["sendCalendarInvite"]>[0]> = {}): Promise<string> {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "msg-cal", threadId: "thread-cal" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await client.sendCalendarInvite({
      userId: SINGLETON_USER_ID,
      to: "wbrunovieira77@gmail.com",
      subject: "Convite: reuniao salto",
      bodyHtml: "<p>Você foi convidado para <strong>reuniao salto</strong>.</p>",
      from: "bruno@saltoup.com",
      organizerEmail: "bruno@saltoup.com",
      attendeeEmails: ["wbrunovieira77@gmail.com"],
      startAt: START,
      endAt: END,
      title: "reuniao salto",
      meetLink: "https://meet.google.com/abc-defg-hij",
      ...overrides,
    });

    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    const body = JSON.parse(init.body) as { raw: string };
    return Buffer.from(body.raw, "base64url").toString("utf-8");
  }

  /** Extract and decode a base64 MIME part by searching for a content-type marker */
  function decodePartAfter(mime: string, marker: string): string {
    const idx = mime.indexOf(marker);
    if (idx === -1) return "";
    // Skip headers until blank line
    const afterHeaders = mime.indexOf("\r\n\r\n", idx);
    if (afterHeaders === -1) return "";
    const b64 = mime.slice(afterHeaders + 4).split("\r\n")[0].trim();
    return Buffer.from(b64, "base64").toString("utf-8");
  }

  it("MIME has inline text/calendar part (not attachment) so Gmail shows RSVP buttons", async () => {
    const mime = await sendAndGetMime();
    expect(mime).toContain("text/calendar");
    expect(mime).not.toContain("Content-Disposition: attachment");
  });

  it("text/calendar Content-Type includes method=REQUEST", async () => {
    const mime = await sendAndGetMime();
    expect(mime).toMatch(/text\/calendar.*method=REQUEST/i);
  });

  it("iCal body contains ORGANIZER with alias email", async () => {
    const mime = await sendAndGetMime();
    const ics = decodePartAfter(mime, "text/calendar");
    expect(ics).toContain("ORGANIZER");
    expect(ics).toContain("bruno@saltoup.com");
  });

  it("iCal body contains ATTENDEE for the recipient", async () => {
    const mime = await sendAndGetMime();
    const ics = decodePartAfter(mime, "text/calendar");
    expect(ics).toContain("ATTENDEE");
    expect(ics).toContain("wbrunovieira77@gmail.com");
  });

  it("HTML body does NOT contain a duplicate Meet link (bodyHtml used as-is)", async () => {
    const mime = await sendAndGetMime();
    const html = decodePartAfter(mime, "text/html");
    // The caller's bodyHtml has no Meet link → so the decoded HTML must not have it either
    expect(html).not.toContain("meet.google.com");
  });

  it("iCal LOCATION contains the Meet link", async () => {
    const mime = await sendAndGetMime();
    const ics = decodePartAfter(mime, "text/calendar");
    expect(ics).toContain("LOCATION:https://meet.google.com/abc-defg-hij");
  });

  it("From header uses the alias email", async () => {
    const mime = await sendAndGetMime();
    expect(mime).toContain("From: bruno@saltoup.com");
  });

  it("iCal has METHOD:REQUEST", async () => {
    const mime = await sendAndGetMime();
    const ics = decodePartAfter(mime, "text/calendar");
    expect(ics).toContain("METHOD:REQUEST");
  });
});
