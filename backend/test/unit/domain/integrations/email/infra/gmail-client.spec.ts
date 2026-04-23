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
  it("calls getValidToken with the singleton userId", async () => {
    const spy = vi.spyOn(googleOAuth, "getValidToken");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ emailAddress: "bruno@wbdigitalsolutions.com", historyId: "12345" }),
    }));

    await client.getProfile(SINGLETON_USER_ID);

    expect(spy).toHaveBeenCalledWith(SINGLETON_USER_ID);
  });

  it("uses the token returned by GoogleOAuthPort as Bearer header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ emailAddress: "bruno@wbdigitalsolutions.com", historyId: "99" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await client.getProfile(SINGLETON_USER_ID);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const auth = (init.headers as Record<string, string>)["Authorization"];
    expect(auth).toBe(`Bearer live-access-token-${SINGLETON_USER_ID}`);
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
