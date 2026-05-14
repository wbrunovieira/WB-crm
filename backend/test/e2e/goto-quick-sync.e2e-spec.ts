import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { GoToApiPort, GoToCallHistoryItem } from "@/domain/integrations/goto/application/ports/goto-api.port";
import { GoToTokenPort } from "@/domain/integrations/goto/application/ports/goto-token.port";
import { S3StoragePort } from "@/domain/integrations/goto/application/ports/s3-storage.port";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function makeJwt(payload: Record<string, unknown> = {}): Promise<string> {
  const { SignJWT } = await import("jose");
  const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "test-secret");
  return new SignJWT({ sub: "user-e2e", role: "sdr", email: "test@test.com", ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(secret);
}

function makeHistoryItem(originatorId: string): GoToCallHistoryItem {
  return {
    originatorId,
    legId: `leg-${originatorId}`,
    direction: "OUTBOUND",
    startTime: new Date(Date.now() - 60_000).toISOString(),
    answerTime: new Date(Date.now() - 50_000).toISOString(),
    duration: 45_000,
    hangupCause: 16,
    caller: { number: "+5511900000001" },
    callee: { number: "+5511999998888" },
  };
}

// ── Fakes ─────────────────────────────────────────────────────────────────────

class FakeGoToApi extends GoToApiPort {
  public historyItems: GoToCallHistoryItem[] = [];
  public lastFetchedSince: string | null = null;

  async fetchCallReport() { return null; }
  async fetchReportsSince() { return []; }
  async refreshToken() { return { accessToken: "tok", refreshToken: "ref", expiresAt: Date.now() + 3_600_000 }; }
  async fetchCallHistorySince(_token: string, since: string) {
    this.lastFetchedSince = since;
    return this.historyItems;
  }
}

const fakeGoToToken = { getValidAccessToken: async () => "fake-access-token" };
const fakeS3 = { upload: async () => "key", download: async () => Buffer.from("") };

// Minimal activities repo stub — createCallActivity will upsert via save()
class FakeActivitiesRepo extends ActivitiesRepository {
  public savedIds: string[] = [];

  async findFirst(where: { gotoCallId?: string }) {
    if (where.gotoCallId && this.savedIds.includes(where.gotoCallId)) {
      // Return a dummy activity to simulate "already exists"
      return { id: { toString: () => "existing" } } as any;
    }
    return null;
  }
  async findMany() { return []; }
  async findById() { return null; }
  async findByIdRaw() { return null; }
  async findByIdForTranscription() { return null; }
  async findByTranscriptionJobId() { return null; }
  async findAnsweredCallsMissingRecordingId() { return []; }
  async save(activity: any) { this.savedIds.push(activity.gotoCallId ?? activity.id?.toString()); }
  async delete() {}
  async markThreadReplied() {}
  async findWhatsAppDriveIds() { return []; }
  async updateEmailOpenStats() {}
  async updateEmailClickStats() {}
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe("POST /goto/quick-sync (e2e)", () => {
  let app: INestApplication;
  let fakeGoToApi: FakeGoToApi;
  let fakeActivitiesRepo: FakeActivitiesRepo;

  beforeAll(async () => {
    process.env.GOTO_WEBHOOK_SECRET = "e2e-secret";
    process.env.GOTO_DEFAULT_OWNER_ID = "e2e-owner-id";

    fakeGoToApi = new FakeGoToApi();
    fakeActivitiesRepo = new FakeActivitiesRepo();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GoToApiPort).useValue(fakeGoToApi)
      .overrideProvider(GoToTokenPort).useValue(fakeGoToToken)
      .overrideProvider(S3StoragePort).useValue(fakeS3)
      .overrideProvider(ActivitiesRepository).useValue(fakeActivitiesRepo)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  // ── Auth guard ──────────────────────────────────────────────────────────────

  it("sem token → 401", async () => {
    const res = await request(app.getHttpServer()).post("/goto/quick-sync");
    expect(res.status).toBe(401);
  });

  it("token inválido → 401", async () => {
    const res = await request(app.getHttpServer())
      .post("/goto/quick-sync")
      .set("Authorization", "Bearer token-invalido");
    expect(res.status).toBe(401);
  });

  // ── Comportamento principal ─────────────────────────────────────────────────

  it("token válido sem itens no GoTo → 200 com zeros", async () => {
    fakeGoToApi.historyItems = [];
    const token = await makeJwt();

    const res = await request(app.getHttpServer())
      .post("/goto/quick-sync")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ fetched: 0, created: 0, skipped: 0 });
  });

  it("token válido com ligações novas → cria atividades e retorna contagem correta", async () => {
    fakeGoToApi.historyItems = [makeHistoryItem("call-sync-001"), makeHistoryItem("call-sync-002")];
    fakeActivitiesRepo.savedIds = [];
    const token = await makeJwt();

    const res = await request(app.getHttpServer())
      .post("/goto/quick-sync")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.fetched).toBe(2);
    expect(res.body.created).toBe(2);
    expect(res.body.skipped).toBe(0);
  });

  it("usa janela padrão de ~2h quando sinceHoursAgo não é fornecido", async () => {
    fakeGoToApi.historyItems = [];
    fakeGoToApi.lastFetchedSince = null;
    const token = await makeJwt();

    await request(app.getHttpServer())
      .post("/goto/quick-sync")
      .set("Authorization", `Bearer ${token}`);

    expect(fakeGoToApi.lastFetchedSince).not.toBeNull();
    const sinceMs = Date.now() - new Date(fakeGoToApi.lastFetchedSince!).getTime();
    // Deve estar entre 1h e 3h (2h padrão com alguma margem de execução)
    expect(sinceMs).toBeGreaterThan(60 * 60 * 1000);
    expect(sinceMs).toBeLessThan(3 * 60 * 60 * 1000);
  });

  it("sinceHoursAgo=4 → janela de ~4h", async () => {
    fakeGoToApi.historyItems = [];
    fakeGoToApi.lastFetchedSince = null;
    const token = await makeJwt();

    await request(app.getHttpServer())
      .post("/goto/quick-sync?sinceHoursAgo=4")
      .set("Authorization", `Bearer ${token}`);

    expect(fakeGoToApi.lastFetchedSince).not.toBeNull();
    const sinceMs = Date.now() - new Date(fakeGoToApi.lastFetchedSince!).getTime();
    expect(sinceMs).toBeGreaterThan(3 * 60 * 60 * 1000);
    expect(sinceMs).toBeLessThan(5 * 60 * 60 * 1000);
  });

  it("sinceHoursAgo=48 é clipado para 24h máximo", async () => {
    fakeGoToApi.historyItems = [];
    fakeGoToApi.lastFetchedSince = null;
    const token = await makeJwt();

    await request(app.getHttpServer())
      .post("/goto/quick-sync?sinceHoursAgo=48")
      .set("Authorization", `Bearer ${token}`);

    expect(fakeGoToApi.lastFetchedSince).not.toBeNull();
    const sinceMs = Date.now() - new Date(fakeGoToApi.lastFetchedSince!).getTime();
    expect(sinceMs).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(sinceMs).toBeLessThan(25 * 60 * 60 * 1000);
  });

  it("idempotência — segunda chamada com mesmas ligações retorna created=0, skipped=N", async () => {
    fakeGoToApi.historyItems = [makeHistoryItem("call-idem-001")];
    fakeActivitiesRepo.savedIds = [];
    const token = await makeJwt();

    await request(app.getHttpServer())
      .post("/goto/quick-sync")
      .set("Authorization", `Bearer ${token}`);

    // Segunda chamada — o fake já tem a atividade salva
    const res = await request(app.getHttpServer())
      .post("/goto/quick-sync")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.created).toBe(0);
    expect(res.body.skipped).toBe(1);
  });
});
