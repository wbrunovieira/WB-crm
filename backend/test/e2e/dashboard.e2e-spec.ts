import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";

let app: INestApplication;
let prisma: PrismaService;
let jwt: JwtService;
let adminToken: string;
let sdrToken: string;
let adminId: string;
let sdrId: string;
let pipelineId: string;
let stageId: string;

beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication();
  await app.init();
  prisma = module.get(PrismaService);
  jwt = module.get(JwtService);

  const admin = await prisma.user.upsert({
    where: { email: "e2e-dashboard-admin@test.com" },
    update: {},
    create: { email: "e2e-dashboard-admin@test.com", name: "Dashboard Admin", password: "hashed", role: "admin" },
  });
  adminId = admin.id;
  adminToken = jwt.sign({ sub: admin.id, name: admin.name, email: admin.email, role: admin.role });

  const sdr = await prisma.user.upsert({
    where: { email: "e2e-dashboard-sdr@test.com" },
    update: {},
    create: { email: "e2e-dashboard-sdr@test.com", name: "Dashboard SDR", password: "hashed", role: "sdr" },
  });
  sdrId = sdr.id;
  sdrToken = jwt.sign({ sub: sdr.id, name: sdr.name, email: sdr.email, role: sdr.role });

  // Seed pipeline + stage for deals
  const pipeline = await prisma.pipeline.create({ data: { name: "E2E Dashboard Pipeline" } });
  pipelineId = pipeline.id;
  const stage = await prisma.stage.create({ data: { name: "E2E Stage", pipelineId, order: 1, probability: 50 } });
  stageId = stage.id;

  // Seed lead
  await prisma.lead.create({ data: { businessName: "E2E Lead", ownerId: adminId } });

  // Seed deal
  await prisma.deal.create({ data: { title: "E2E Deal", ownerId: adminId, stageId, value: 10000, status: "open" } });

  // Seed activity
  await prisma.activity.create({ data: { type: "call", subject: "E2E Call", ownerId: adminId, completed: false } });
});

afterAll(async () => {
  await prisma.activity.deleteMany({ where: { ownerId: { in: [adminId, sdrId] } } });
  await prisma.deal.deleteMany({ where: { stageId } });
  await prisma.stage.deleteMany({ where: { id: stageId } });
  await prisma.pipeline.deleteMany({ where: { id: pipelineId } });
  await prisma.lead.deleteMany({ where: { ownerId: { in: [adminId, sdrId] } } });
  await prisma.user.deleteMany({ where: { email: { in: ["e2e-dashboard-admin@test.com", "e2e-dashboard-sdr@test.com"] } } });
  await app.close();
});

// ── GET /dashboard/stats ──────────────────────────────────────────────────────

describe("GET /dashboard/stats (e2e)", () => {
  it("retorna 401 sem token", async () => {
    await request(app.getHttpServer()).get("/dashboard/stats").expect(401);
  });

  it("retorna ManagerStats com shape correto (admin)", async () => {
    const res = await request(app.getHttpServer())
      .get("/dashboard/stats")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const body = res.body;

    // period
    expect(body).toHaveProperty("period");
    expect(typeof body.period.startDate).toBe("string");
    expect(typeof body.period.endDate).toBe("string");

    // byUser — array of UserMetrics
    expect(Array.isArray(body.byUser)).toBe(true);
    if (body.byUser.length > 0) {
      const user = body.byUser[0];
      expect(user).toHaveProperty("userId");
      expect(user).toHaveProperty("userName");
      expect(user).toHaveProperty("userEmail");
      expect(user.leads).toHaveProperty("created");
      expect(user.leads).toHaveProperty("converted");
      expect(user.leads).toHaveProperty("conversionRate");
      expect(user.organizations).toHaveProperty("created");
      expect(user.deals).toHaveProperty("created");
      expect(user.deals).toHaveProperty("won");
      expect(user.deals).toHaveProperty("lost");
      expect(user.deals).toHaveProperty("open");
      expect(user.deals).toHaveProperty("totalValue");
      expect(user.deals).toHaveProperty("avgValue");
      expect(user.contacts).toHaveProperty("created");
      expect(user.partners).toHaveProperty("created");
      expect(user.activities).toHaveProperty("total");
      expect(user.activities).toHaveProperty("completed");
      expect(user.activities).toHaveProperty("pending");
      expect(user.activities).toHaveProperty("overdue");
      expect(user.activities).toHaveProperty("byType");
      expect(user).toHaveProperty("stageChanges");
    }

    // totals
    expect(body.totals).toHaveProperty("leads");
    expect(body.totals.leads).toHaveProperty("total");
    expect(body.totals.leads).toHaveProperty("converted");
    expect(body.totals.leads).toHaveProperty("conversionRate");
    expect(body.totals).toHaveProperty("organizations");
    expect(body.totals).toHaveProperty("deals");
    expect(body.totals.deals).toHaveProperty("byStage");
    expect(Array.isArray(body.totals.deals.byStage)).toBe(true);
    expect(body.totals).toHaveProperty("contacts");
    expect(body.totals).toHaveProperty("partners");
    expect(body.totals.partners).toHaveProperty("byType");
    expect(body.totals).toHaveProperty("activities");
    expect(body.totals.activities).toHaveProperty("byType");
    expect(body.totals).toHaveProperty("stageChanges");
    expect(body.totals.stageChanges).toHaveProperty("total");
    expect(body.totals.stageChanges).toHaveProperty("byStage");

    // comparison
    expect(body).toHaveProperty("comparison");
    expect(typeof body.comparison.leads).toBe("number");
    expect(typeof body.comparison.organizations).toBe("number");
    expect(typeof body.comparison.deals).toBe("number");
    expect(typeof body.comparison.dealsValue).toBe("number");
    expect(typeof body.comparison.contacts).toBe("number");
    expect(typeof body.comparison.partners).toBe("number");
    expect(typeof body.comparison.activities).toBe("number");
  });

  it("admin inclui dados do seed nas métricas", async () => {
    const res = await request(app.getHttpServer())
      .get("/dashboard/stats?period=month")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    // totals devem refletir os seeds (lead + deal + activity)
    expect(res.body.totals.leads.total).toBeGreaterThanOrEqual(1);
    expect(res.body.totals.deals.total).toBeGreaterThanOrEqual(1);
    expect(res.body.totals.activities.total).toBeGreaterThanOrEqual(1);
  });

  it("SDR vê apenas seus próprios dados", async () => {
    const res = await request(app.getHttpServer())
      .get("/dashboard/stats")
      .set("Authorization", `Bearer ${sdrToken}`)
      .expect(200);

    // SDR sem dados — byUser deve estar vazio ou conter apenas o sdr sem atividade
    res.body.byUser.forEach((u: any) => {
      expect(u.userId).toBe(sdrId);
    });
  });

  it("aceita ?period=today sem erro", async () => {
    await request(app.getHttpServer())
      .get("/dashboard/stats?period=today")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
  });

  it("aceita ?period=week sem erro", async () => {
    await request(app.getHttpServer())
      .get("/dashboard/stats?period=week")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
  });

  it("aceita período custom com datas ISO", async () => {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    const end = new Date();

    const res = await request(app.getHttpServer())
      .get(`/dashboard/stats?period=custom&startDate=${start.toISOString()}&endDate=${end.toISOString()}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.period.startDate).toBeDefined();
    expect(res.body.period.endDate).toBeDefined();
  });

  it("admin filtrado por ownerId retorna apenas dados do owner", async () => {
    const res = await request(app.getHttpServer())
      .get(`/dashboard/stats?ownerId=${sdrId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    // SDR não tem dados — totals devem ser zero
    expect(res.body.totals.leads.total).toBe(0);
    expect(res.body.totals.deals.total).toBe(0);
  });

  it("conta negócio ganho pela data de fechamento (closedAt), não pela data de criação", async () => {
    const now = new Date();
    const insidePeriod = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 dias atrás — dentro de "week"
    const outsidePeriod = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000); // 40 dias atrás — fora de "week"

    const before = await request(app.getHttpServer())
      .get("/dashboard/stats?period=week")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    const baselineValue = before.body.totals.deals.totalValue;
    const baselineWon = before.body.totals.deals.won;

    // Criado há muito tempo, mas GANHO recentemente — deve contar nas estatísticas da semana.
    const wonRecently = await prisma.deal.create({
      data: {
        title: "E2E Won Recently",
        ownerId: adminId,
        stageId,
        value: 5000,
        status: "won",
        createdAt: outsidePeriod,
        closedAt: insidePeriod,
      },
    });
    // Criado recentemente, mas GANHO há muito tempo — NÃO deve contar nas estatísticas da semana.
    const wonLongAgo = await prisma.deal.create({
      data: {
        title: "E2E Won Long Ago",
        ownerId: adminId,
        stageId,
        value: 9999,
        status: "won",
        createdAt: insidePeriod,
        closedAt: outsidePeriod,
      },
    });

    try {
      const res = await request(app.getHttpServer())
        .get("/dashboard/stats?period=week")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.totals.deals.totalValue).toBe(baselineValue + 5000);
      expect(res.body.totals.deals.won).toBe(baselineWon + 1);
    } finally {
      await prisma.deal.deleteMany({ where: { id: { in: [wonRecently.id, wonLongAgo.id] } } });
    }
  });

  it("período custom com data sem hora (YYYY-MM-DD, como o front envia) inclui o dia inteiro", async () => {
    // O front (admin/manager) sempre manda startDate/endDate como "YYYY-MM-DD" — sem isso,
    // new Date("YYYY-MM-DD") vira meia-noite UTC e um endDate assim exclui o resto do dia
    // (no caso de period=today, onde startDate === endDate, a janela vira vazia sempre).
    const todayDateOnly = new Date().toISOString().slice(0, 10);

    const before = await request(app.getHttpServer())
      .get(`/dashboard/stats?period=custom&startDate=${todayDateOnly}&endDate=${todayDateOnly}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    const baselineWon = before.body.totals.deals.won;

    const wonToday = await prisma.deal.create({
      data: { title: "E2E Won Today", ownerId: adminId, stageId, value: 1234, status: "won", closedAt: new Date() },
    });

    try {
      const res = await request(app.getHttpServer())
        .get(`/dashboard/stats?period=custom&startDate=${todayDateOnly}&endDate=${todayDateOnly}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.totals.deals.won).toBe(baselineWon + 1);
    } finally {
      await prisma.deal.deleteMany({ where: { id: wonToday.id } });
    }
  });

  it("lista os negócios ganhos no período (wonDeals) com título, valor e data de fechamento", async () => {
    // O dashboard mostrava só a CONTAGEM de ganhos — sem saber QUAIS negócios entraram no
    // número, não dá para conferir o resultado da semana sem consultar o banco.
    const closedAt = new Date();

    const won = await prisma.deal.create({
      data: {
        title: "E2E Won Deal Listed",
        ownerId: adminId,
        stageId,
        value: 4321,
        currency: "BRL",
        status: "won",
        closedAt,
      },
    });
    // Perdido no período: não pode aparecer na lista de ganhos.
    const lost = await prisma.deal.create({
      data: {
        title: "E2E Lost Deal Not Listed",
        ownerId: adminId,
        stageId,
        value: 1111,
        status: "lost",
        closedAt,
      },
    });

    try {
      const res = await request(app.getHttpServer())
        .get("/dashboard/stats?period=week")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      const wonDeals = res.body.totals.deals.wonDeals;
      expect(Array.isArray(wonDeals)).toBe(true);

      const listed = wonDeals.find((d: any) => d.id === won.id);
      expect(listed).toBeDefined();
      expect(listed.title).toBe("E2E Won Deal Listed");
      expect(listed.value).toBe(4321);
      expect(listed.currency).toBe("BRL");
      expect(new Date(listed.closedAt).getTime()).toBe(closedAt.getTime());

      expect(wonDeals.some((d: any) => d.id === lost.id)).toBe(false);
    } finally {
      await prisma.deal.deleteMany({ where: { id: { in: [won.id, lost.id] } } });
    }
  });

  it("lista os negócios ABERTOS previstos para o período, e separa atrasados / sem data", async () => {
    // "Devo prospectar mais ou focar nos fechamentos?" precisa do pipeline previsto para a
    // semana — não dos negócios criados nela (o que a métrica de negócios já mostrava).
    const now = new Date();
    const insidePeriod = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // dentro de "week"
    const beforePeriod = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000); // antes da semana

    const expected = await prisma.deal.create({
      data: {
        title: "E2E Forecast This Week",
        ownerId: adminId,
        stageId,
        value: 700,
        currency: "BRL",
        status: "open",
        expectedCloseDate: insidePeriod,
      },
    });
    // Previsto para antes do período e ainda aberto → atrasado, não previsto.
    const overdue = await prisma.deal.create({
      data: {
        title: "E2E Forecast Overdue",
        ownerId: adminId,
        stageId,
        value: 200,
        status: "open",
        expectedCloseDate: beforePeriod,
      },
    });
    // Sem data prevista → invisível numa previsão; precisa ser contado à parte.
    const undated = await prisma.deal.create({
      data: { title: "E2E Forecast No Date", ownerId: adminId, stageId, value: 900, status: "open" },
    });
    // Já ganho dentro do período: é resultado, não previsão.
    const alreadyWon = await prisma.deal.create({
      data: {
        title: "E2E Forecast Already Won",
        ownerId: adminId,
        stageId,
        value: 1500,
        status: "won",
        closedAt: insidePeriod,
        expectedCloseDate: insidePeriod,
      },
    });

    try {
      const res = await request(app.getHttpServer())
        .get("/dashboard/stats?period=week")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      const forecast = res.body.totals.deals.forecast;
      const ids = forecast.deals.map((d: any) => d.id);

      expect(ids).toContain(expected.id);
      expect(ids).not.toContain(overdue.id);
      expect(ids).not.toContain(undated.id);
      expect(ids).not.toContain(alreadyWon.id);

      const listed = forecast.deals.find((d: any) => d.id === expected.id);
      expect(listed.title).toBe("E2E Forecast This Week");
      expect(listed.value).toBe(700);
      expect(listed.currency).toBe("BRL");
      expect(listed.stageName).toBeTruthy();
      expect(new Date(listed.expectedCloseDate).getTime()).toBe(insidePeriod.getTime());

      expect(forecast.overdue.count).toBeGreaterThanOrEqual(1);
      expect(forecast.overdue.value).toBeGreaterThanOrEqual(200);
      expect(forecast.withoutDate.count).toBeGreaterThanOrEqual(1);
      expect(forecast.withoutDate.value).toBeGreaterThanOrEqual(900);
    } finally {
      await prisma.deal.deleteMany({
        where: { id: { in: [expected.id, overdue.id, undated.id, alreadyWon.id] } },
      });
    }
  });

  it("inclui em byUser um usuário que só fechou um negócio antigo no período (sem criar nada novo)", async () => {
    const outsidePeriod = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // criado fora da semana

    const sdrClosedOld = await prisma.deal.create({
      data: {
        title: "E2E SDR Closed Old Deal",
        ownerId: sdrId,
        stageId,
        value: 777,
        status: "won",
        createdAt: outsidePeriod, // não conta como "criado" nesta semana
        closedAt: new Date(), // mas foi fechado agora — deve aparecer
      },
    });

    try {
      const res = await request(app.getHttpServer())
        .get("/dashboard/stats?period=week")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      const sdrRow = res.body.byUser.find((u: any) => u.userId === sdrId);
      expect(sdrRow).toBeDefined();
      expect(sdrRow.deals.won).toBeGreaterThanOrEqual(1);
      expect(sdrRow.deals.created).toBe(0);
    } finally {
      await prisma.deal.deleteMany({ where: { id: sdrClosedOld.id } });
    }
  });
});

// ── GET /dashboard/timeline ───────────────────────────────────────────────────

describe("GET /dashboard/timeline (e2e)", () => {
  it("retorna 401 sem token", async () => {
    await request(app.getHttpServer()).get("/dashboard/timeline").expect(401);
  });

  it("retorna array de TimelinePoint com shape correto", async () => {
    const res = await request(app.getHttpServer())
      .get("/dashboard/timeline")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      const point = res.body[0];
      expect(point).toHaveProperty("date");
      expect(point).toHaveProperty("leads");
      expect(point).toHaveProperty("converted");
      expect(point).toHaveProperty("deals");
      expect(point).toHaveProperty("dealsValue");
    }
  });

  it("dados do seed aparecem no timeline (period=month)", async () => {
    const res = await request(app.getHttpServer())
      .get("/dashboard/timeline?period=month")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const totalLeads = res.body.reduce((s: number, p: any) => s + p.leads, 0);
    const totalDeals = res.body.reduce((s: number, p: any) => s + p.deals, 0);
    expect(totalLeads).toBeGreaterThanOrEqual(1);
    expect(totalDeals).toBeGreaterThanOrEqual(1);
  });

  it("aceita ?period=week sem erro", async () => {
    await request(app.getHttpServer())
      .get("/dashboard/timeline?period=week")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
  });
});

// ── GET /dashboard/activity-calendar ─────────────────────────────────────────

describe("GET /dashboard/activity-calendar (e2e)", () => {
  it("retorna 401 sem token", async () => {
    await request(app.getHttpServer()).get("/dashboard/activity-calendar").expect(401);
  });

  it("retorna array de DailyActivityData com shape correto", async () => {
    const res = await request(app.getHttpServer())
      .get("/dashboard/activity-calendar")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      const day = res.body[0];
      expect(day).toHaveProperty("date");
      expect(day).toHaveProperty("total");
      expect(day).toHaveProperty("completed");
      expect(day).toHaveProperty("pending");
      expect(day).toHaveProperty("failed");
      expect(day).toHaveProperty("skipped");
      expect(day).toHaveProperty("byType");
      expect(day).toHaveProperty("completedByType");
      expect(day).toHaveProperty("pendingByType");
      expect(day).toHaveProperty("failedByType");
      expect(day).toHaveProperty("skippedByType");
    }
  });

  it("aceita ?year=&month= sem erro", async () => {
    const now = new Date();
    const res = await request(app.getHttpServer())
      .get(`/dashboard/activity-calendar?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it("atividade do seed aparece no calendário do mês atual", async () => {
    const now = new Date();
    const res = await request(app.getHttpServer())
      .get(`/dashboard/activity-calendar?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const total = res.body.reduce((s: number, d: any) => s + d.total, 0);
    expect(total).toBeGreaterThanOrEqual(1);
  });
});
