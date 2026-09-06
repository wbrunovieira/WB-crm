/**
 * Ganhar um negócio vinculado a um lead precisa, de ponta a ponta, transformar esse lead em
 * cliente: organização criada, negócio religado a ela, lead marcado como convertido.
 *
 * O unitário prova a decisão; este prova o efeito real no banco — inclusive a fiação do Nest
 * (DealsModule -> LeadConversionModule), que um teste com fake nunca exercita.
 *
 * Autolimpeza no INÍCIO: o banco de dev é compartilhado e uma execução interrompida deixa
 * resíduo que quebraria a próxima.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";

const EMAIL = "e2e-deal-won-converts@test.com";

let app: INestApplication;
let prisma: PrismaService;
let token: string;
let ownerId: string;
let stageId: string;
let pipelineId: string;

async function limpar() {
  await prisma.dealValueHistory.deleteMany({ where: { deal: { ownerId } } });
  await prisma.dealStageHistory.deleteMany({ where: { deal: { ownerId } } });
  await prisma.deal.deleteMany({ where: { ownerId } });
  await prisma.activity.deleteMany({ where: { ownerId } });
  await prisma.leadContact.deleteMany({ where: { lead: { ownerId } } });
  await prisma.lead.deleteMany({ where: { ownerId } });
  await prisma.contact.deleteMany({ where: { ownerId } });
  await prisma.organization.deleteMany({ where: { ownerId } });
}

beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication();
  await app.init();
  prisma = module.get(PrismaService);
  const jwt = module.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {},
    create: { email: EMAIL, name: "E2E Won Converts", password: "hashed", role: "admin" },
  });
  ownerId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });

  const pipeline = await prisma.pipeline.create({ data: { name: `E2E Won Converts ${Date.now()}` } });
  pipelineId = pipeline.id;
  const stage = await prisma.stage.create({ data: { name: "Etapa", pipelineId, order: 1, probability: 50 } });
  stageId = stage.id;

  await limpar();
});

beforeEach(limpar);

afterAll(async () => {
  await limpar();
  await prisma.stage.deleteMany({ where: { pipelineId } });
  await prisma.pipeline.deleteMany({ where: { id: pipelineId } });
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await app.close();
});

const auth = (r: request.Test) => r.set("Authorization", `Bearer ${token}`);

async function criarLead(businessName = "Turon Auto Peças E2E") {
  const lead = await prisma.lead.create({
    data: { ownerId, businessName, email: "contato@turon-e2e.com", phone: "+5511999990000" },
  });
  return lead.id;
}

async function criarNegocioNoLead(leadId: string) {
  const res = await auth(
    request(app.getHttpServer()).post("/deals").send({
      title: "Site institucional", value: 2500, currency: "BRL", stageId, leadId,
    }),
  );
  expect(res.status).toBe(201);
  return res.body.id ?? res.body.deal?.id;
}

const ganhar = (dealId: string, body: Record<string, unknown> = {}) =>
  auth(request(app.getHttpServer()).patch(`/deals/${dealId}`).send({ status: "won", ...body }));

describe("PATCH /deals/:id — ganhar um negócio de lead", () => {
  it("cria a organização, religa o negócio a ela e marca o lead como convertido", async () => {
    const leadId = await criarLead();
    const dealId = await criarNegocioNoLead(leadId);

    const res = await ganhar(dealId);
    expect(res.status).toBe(200);

    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    expect(deal?.status).toBe("won");
    expect(deal?.organizationId).toBeTruthy();
    // O leadId permanece: a organização precisa manter o rastro da prospecção que a ganhou.
    expect(deal?.leadId).toBe(leadId);

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    expect(lead?.convertedToOrganizationId).toBe(deal?.organizationId);
    expect(lead?.isArchived).toBe(true);

    const org = await prisma.organization.findUnique({ where: { id: deal!.organizationId! } });
    expect(org?.name).toBe("Turon Auto Peças E2E");
    expect(org?.sourceLeadId).toBe(leadId);
  });

  it("um segundo negócio ganho no mesmo lead reaproveita a organização, não duplica o cliente", async () => {
    const leadId = await criarLead();
    const primeiro = await criarNegocioNoLead(leadId);
    await ganhar(primeiro);
    const orgId = (await prisma.deal.findUnique({ where: { id: primeiro } }))!.organizationId;

    const segundo = await criarNegocioNoLead(leadId);
    const res = await ganhar(segundo);
    expect(res.status).toBe(200);

    const deal = await prisma.deal.findUnique({ where: { id: segundo } });
    expect(deal?.organizationId).toBe(orgId);
    expect(await prisma.organization.count({ where: { ownerId } })).toBe(1);
  });

  it("não converte o lead ao marcar o negócio como perdido", async () => {
    const leadId = await criarLead();
    const dealId = await criarNegocioNoLead(leadId);

    const res = await auth(request(app.getHttpServer()).patch(`/deals/${dealId}`).send({ status: "lost" }));
    expect(res.status).toBe(200);

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    expect(lead?.convertedToOrganizationId).toBeNull();
    expect(await prisma.organization.count({ where: { ownerId } })).toBe(0);
  });

  it("registra o fechamento no histórico de valor junto com a conversão", async () => {
    const leadId = await criarLead();
    const dealId = await criarNegocioNoLead(leadId);

    await ganhar(dealId);

    const historico = await prisma.dealValueHistory.findMany({ where: { dealId } });
    expect(historico).toHaveLength(1);
    expect(historico[0].fromStatus).toBe("open");
    expect(historico[0].toStatus).toBe("won");
  });
});
