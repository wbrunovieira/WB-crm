import { createServer, type Server } from "node:http";

/**
 * Mock leve do backend NestJS para o E2E de agendamento (o Playwright deste repo
 * sobe só o Next, sem NestJS — o CI também). Escuta em NEXT_PUBLIC_BACKEND_URL
 * (localhost:3010) e responde tanto ao fetch server-side do Next (GET dos slots)
 * quanto ao POST do browser (com CORS/preflight, já que é cross-origin 3100→3010).
 *
 * Representa um link gerado para um PARTNER: o GET devolve o partner como entidade
 * e o POST registra o agendamento + os destinatários da confirmação (convidado =
 * e-mail do partner; organizador = dono), para o teste asseverar "os dois recebem".
 */

export const PARTNER_TOKEN = "e2e-partner-book-tok";
export const PARTNER_NAME = "Agência Fake E2E";
export const PARTNER_EMAIL = "agencia-fake@e2e.test";
export const PARTNER_ADDRESS = "Av. Teste, 100 — Teresópolis";
export const OWNER_EMAIL = "bruno@wbdigitalsolutions.com"; // organizador (nós)

export interface CapturedBooking {
  token: string;
  startISO: string;
  mode: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeeWhatsapp: string;
  address?: string;
}

export interface MockBackend {
  server: Server;
  bookings: CapturedBooking[];
  /** Destinatários da confirmação do último agendamento (convidado + organizador). */
  lastRecipients: string[];
  close: () => Promise<void>;
}

// Slots num dia útil ~3 dias à frente; horários UTC que caem em BRT redondo
// (12:00Z = 09:00, 13:00Z = 10:00) para clicar por texto "09:00"/"10:00".
function futureSlots(): { start: string; end: string }[] {
  const base = new Date(Date.now() + 3 * 86_400_000);
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, "0");
  const d = String(base.getUTCDate()).padStart(2, "0");
  const mk = (hUtc: number) => {
    const start = `${y}-${m}-${d}T${String(hUtc).padStart(2, "0")}:00:00.000Z`;
    const end = new Date(new Date(start).getTime() + 30 * 60_000).toISOString();
    return { start, end };
  };
  return [mk(12), mk(13), mk(14)]; // 09:00, 10:00, 11:00 BRT
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

export function startMockBackend(port = 3010): Promise<MockBackend> {
  const bookings: CapturedBooking[] = [];
  const state = { lastRecipients: [] as string[] };

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    const send = (code: number, body: unknown) =>
      res.writeHead(code, { "Content-Type": "application/json", ...CORS }).end(JSON.stringify(body));

    if (req.method === "OPTIONS") return res.writeHead(204, CORS).end();

    const bookingMatch = url.pathname.match(/^\/public\/booking\/([^/]+)$/);
    if (bookingMatch && decodeURIComponent(bookingMatch[1]) === PARTNER_TOKEN) {
      if (req.method === "GET") {
        return send(200, {
          bookingType: { name: "Reunião 30min", durationMinutes: 30, timeZone: "America/Sao_Paulo" },
          locationModes: ["online", "presential"],
          lead: { name: PARTNER_NAME, address: PARTNER_ADDRESS, email: PARTNER_EMAIL },
          slots: futureSlots(),
        });
      }
      if (req.method === "POST") {
        let raw = "";
        req.on("data", (c) => (raw += c));
        req.on("end", () => {
          const body = JSON.parse(raw || "{}");
          bookings.push({ token: PARTNER_TOKEN, ...body });
          // O que o backend real notificaria: convite para o convidado (partner)
          // e cópia para o organizador (nós).
          state.lastRecipients = [body.attendeeEmail || PARTNER_EMAIL, OWNER_EMAIL];
          const startISO = body.startISO;
          const endISO = new Date(new Date(startISO).getTime() + 30 * 60_000).toISOString();
          send(201, { manageToken: "mock-manage-123", meetLink: "https://meet.google.com/mock-abc-def", startAt: startISO, endAt: endISO, mode: body.mode });
        });
        return;
      }
    }
    return send(404, { message: "not found" });
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve({
        server,
        bookings,
        get lastRecipients() { return state.lastRecipients; },
        close: () => new Promise<void>((r) => server.close(() => r())),
      } as MockBackend);
    });
  });
}
