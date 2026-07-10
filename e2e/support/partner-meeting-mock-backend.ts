import { createServer, type Server } from "node:http";

/**
 * Lightweight mock of the NestJS backend for the partner "schedule meeting"
 * Playwright journey. Listens on NEXT_PUBLIC_BACKEND_URL (localhost:3010) and
 * serves both the Next server-side fetches (auth, partner, meetings list) and
 * the browser-side modal calls (aliases, title check, POST /meetings). It never
 * calls Google — it stands in for the backend and RECORDS the create request.
 */

export const USER_ID = "user-e2e-partner-meet";
export const USER_EMAIL = "e2e-partner-meet@test.com";
export const PARTNER_ID = "partner-e2e-meet";
export const PARTNER_NAME = "Partner Meet UI E2E";
export const CLIENT_EMAIL = "cliente-ui-e2e@test.com";

export interface CapturedMeeting {
  title: string;
  startAt: string;
  attendeeEmails: string[];
  partnerId?: string;
}

export interface MeetingMock {
  server: Server;
  created: CapturedMeeting[];
  close: () => Promise<void>;
}

const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
// The frontend's NextAuth authorize only DECODES this token (it does not verify
// the signature), so a forged JWT with the right payload is enough to log in.
function forgeAccessToken(): string {
  const header = b64url({ alg: "HS256", typ: "JWT" });
  const payload = b64url({ sub: USER_ID, email: USER_EMAIL, name: "E2E User", role: "admin" });
  return `${header}.${payload}.sig`;
}

const partner = {
  id: PARTNER_ID, name: PARTNER_NAME, legalName: null, foundationDate: null,
  partnerType: "consultoria", website: null, email: "partner@e2e.test", phone: null, whatsapp: "+5521999990000",
  country: null, state: "RJ", city: "Teresópolis", zipCode: null, streetAddress: "Av. Teste, 100",
  linkedin: null, instagram: null, facebook: null, twitter: null, industry: null,
  employeeCount: null, companySize: null, description: null, expertise: null, notes: null,
  lastContactDate: null, createdAt: "2026-07-01T00:00:00.000Z",
  contacts: [{ id: "c-e2e-1", name: "Cliente Diego", email: CLIENT_EMAIL, phone: null, position: null, role: "Contato" }],
  activities: [], referredLeads: [],
  _count: { contacts: 1, activities: 0, referredLeads: 0 },
  owner: { id: USER_ID, name: "E2E User", email: USER_EMAIL },
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

export function startMeetingMockBackend(port = 3010): Promise<MeetingMock> {
  const created: CapturedMeeting[] = [];

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    const path = url.pathname;
    const send = (code: number, body: unknown) =>
      res.writeHead(code, { "Content-Type": "application/json", ...CORS }).end(JSON.stringify(body));

    if (req.method === "OPTIONS") return res.writeHead(204, CORS).end();

    if (req.method === "POST" && path === "/auth/login") return send(200, { accessToken: forgeAccessToken() });
    if (req.method === "GET" && path === `/partners/${PARTNER_ID}/products`) {
      return send(200, [
        { id: "pp-1", productId: "prod-1", productName: "Desenvolvimento Web", expertiseLevel: "expert", canRefer: true, canDeliver: true, notes: null },
      ]);
    }
    if (req.method === "GET" && path === `/partners/${PARTNER_ID}`) return send(200, partner);
    if (req.method === "GET" && path === "/meetings" && !url.searchParams.has("title")) return send(200, []);
    if (req.method === "GET" && path === "/email/aliases") return send(200, { aliases: [] });
    if (req.method === "GET" && path === "/meetings/check-title") return send(200, { exists: false });

    if (req.method === "POST" && path === "/meetings") {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        const body = JSON.parse(raw || "{}");
        created.push({ title: body.title, startAt: body.startAt, attendeeEmails: body.attendeeEmails ?? [], partnerId: body.partnerId });
        send(201, {
          id: "meet-created-e2e", title: body.title, startAt: body.startAt, endAt: body.endAt,
          status: "scheduled", meetLink: "https://meet.google.com/ui-e2e-abc",
          attendeeEmails: body.attendeeEmails ?? [], partnerId: body.partnerId,
          leadId: null, contactId: null, organizationId: null, dealId: null,
        });
      });
      return;
    }

    return send(404, { message: "not found" });
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve({ server, created, close: () => new Promise<void>((r) => server.close(() => r())) });
    });
  });
}
