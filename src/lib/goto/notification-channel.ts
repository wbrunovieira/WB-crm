import type {
  GoToChannelResponse,
  GoToSubscriptionResponse,
} from "./types";

const GOTO_API = "https://api.goto.com";

function authHeader(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

export async function createNotificationChannel(
  accessToken: string,
  webhookUrl: string
): Promise<GoToChannelResponse> {
  const nickname = `wb-crm-${Date.now()}`;

  const res = await fetch(
    `${GOTO_API}/notification-channel/v1/channels/${nickname}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader(accessToken),
      },
      body: JSON.stringify({ webhookUrl }),
    }
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(
      `GoTo create channel failed: ${res.status} ${JSON.stringify(error)}`
    );
  }

  return res.json();
}

export async function createCallEventsSubscription(
  accessToken: string,
  channelId: string
): Promise<GoToSubscriptionResponse> {
  const accountKey = process.env.GOTO_ACCOUNT_KEY!;

  const res = await fetch(`${GOTO_API}/call-events/v1/subscriptions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(accessToken),
    },
    body: JSON.stringify({
      channelId,
      accountKeys: [
        {
          id: accountKey,
          events: ["STARTING", "ENDING"],
        },
      ],
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(
      `GoTo call-events subscription failed: ${res.status} ${JSON.stringify(error)}`
    );
  }

  return res.json();
}

export async function createCallReportSubscription(
  accessToken: string,
  channelId: string
): Promise<GoToSubscriptionResponse> {
  const accountKey = process.env.GOTO_ACCOUNT_KEY!;

  const res = await fetch(
    `${GOTO_API}/call-events-report/v1/subscriptions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader(accessToken),
      },
      body: JSON.stringify({
        channelId,
        accountKeys: [
          {
            id: accountKey,
            events: ["REPORT_SUMMARY"],
          },
        ],
      }),
    }
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(
      `GoTo call-report subscription failed: ${res.status} ${JSON.stringify(error)}`
    );
  }

  return res.json();
}
