import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { ProposalAgentPort } from "@/domain/integrations/proposal-agent/application/ports/proposal-agent.port";
import { GoogleDrivePort } from "@/domain/integrations/whatsapp/application/ports/google-drive.port";

// ─── Fake ports ───────────────────────────────────────────────────────────────
const fakeProposalAgentPort = {
  trigger: async () => ({ jobId: "fake-e2e-job-001" }),
  answer: async () => undefined,
};

const fakeGoogleDrivePort = {
  uploadFile: async (opts: { name: string }) => ({
    id: "fake-drive-id-e2e",
    webViewLink: `https://drive.google.com/file/d/fake-drive-id-e2e/view`,
  }),
  deleteFile: async () => undefined,
  getOrCreateFolder: async () => "fake-folder-id-e2e",
};

// ─── Shared state ─────────────────────────────────────────────────────────────
let app: INestApplication;
let prisma: PrismaService;
let jwt: JwtService;
let token: string;
let otherToken: string;
let ownerId: string;
let otherUserId: string;
let leadId: string;

const INTERNAL_SECRET = "e2e-webhook-secret";

beforeAll(async () => {
  process.env.WEBHOOK_SECRET = INTERNAL_SECRET;

  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ProposalAgentPort)
    .useValue(fakeProposalAgentPort)
    .overrideProvider(GoogleDrivePort)
    .useValue(fakeGoogleDrivePort)
    .compile();

  app = module.createNestApplication();
  await app.init();

  prisma = module.get(PrismaService);
  jwt = module.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: "e2e-proposal-agent@test.com" },
    update: {},
    create: { email: "e2e-proposal-agent@test.com", name: "E2E Agent User", password: "hashed", role: "sdr" },
  });
  ownerId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });

  const other = await prisma.user.upsert({
    where: { email: "e2e-proposal-agent-other@test.com" },
    update: {},
    create: { email: "e2e-proposal-agent-other@test.com", name: "E2E Other User", password: "hashed", role: "sdr" },
  });
  otherUserId = other.id;
  otherToken = jwt.sign({ sub: other.id, name: other.name, email: other.email, role: other.role });

  const lead = await prisma.lead.create({
    data: { businessName: "Lead Agente Proposta E2E", ownerId, status: "new", city: "São Paulo" },
  });
  leadId = lead.id;
});

afterEach(async () => {
  await prisma.proposal.deleteMany({ where: { ownerId } });
});

afterAll(async () => {
  await prisma.proposal.deleteMany({ where: { ownerId } });
  await prisma.lead.deleteMany({ where: { ownerId } });
  await prisma.user.deleteMany({
    where: { email: { in: ["e2e-proposal-agent@test.com", "e2e-proposal-agent-other@test.com"] } },
  });
  await app.close();
});

// ─── POST /leads/:id/proposal-agent ───────────────────────────────────────────
describe("POST /leads/:id/proposal-agent", () => {
  it("retorna 401 sem token", async () => {
    await request(app.getHttpServer())
      .post(`/leads/${leadId}/proposal-agent`)
      .send({ brand: "wb", contacts: [] })
      .expect(401);
  });

  it("retorna 400 sem brand", async () => {
    await request(app.getHttpServer())
      .post(`/leads/${leadId}/proposal-agent`)
      .set("Authorization", `Bearer ${token}`)
      .send({ contacts: [] })
      .expect(400);
  });

  it("retorna 404 para lead inexistente", async () => {
    await request(app.getHttpServer())
      .post("/leads/nonexistent-lead-id/proposal-agent")
      .set("Authorization", `Bearer ${token}`)
      .send({ brand: "wb", contacts: [] })
      .expect(404);
  });

  it("aciona o agente e retorna 202 com proposalId e jobId", async () => {
    const res = await request(app.getHttpServer())
      .post(`/leads/${leadId}/proposal-agent`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        brand: "wb",
        contacts: [{ name: "João Silva", gender: "male" }],
        instructions: "Foco em automação",
      })
      .expect(202);

    expect(res.body.status).toBe("accepted");
    expect(res.body.proposalId).toBeDefined();
    expect(res.body.jobId).toBe("fake-e2e-job-001");

    // Verifica que a proposta foi salva no banco com os campos do agente
    const proposal = await prisma.proposal.findUnique({ where: { id: res.body.proposalId } });
    expect(proposal).toBeTruthy();
    expect(proposal!.agentJobId).toBe("fake-e2e-job-001");
    expect(proposal!.agentStatus).toBe("processing");
    expect(proposal!.agentTriggeredAt).toBeInstanceOf(Date);
    expect(proposal!.leadId).toBe(leadId);
    expect(proposal!.ownerId).toBe(ownerId);
  });

  it("aciona com brand salto", async () => {
    const res = await request(app.getHttpServer())
      .post(`/leads/${leadId}/proposal-agent`)
      .set("Authorization", `Bearer ${token}`)
      .send({ brand: "salto", contacts: [{ name: "Maria Santos", gender: "female" }] })
      .expect(202);

    expect(res.body.proposalId).toBeDefined();
  });

  it("outro usuário não pode acionar para lead que não é seu", async () => {
    await request(app.getHttpServer())
      .post(`/leads/${leadId}/proposal-agent`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ brand: "wb", contacts: [] })
      .expect(404);
  });
});

// ─── POST /proposals/:id/agent-answer ─────────────────────────────────────────
describe("POST /proposals/:id/agent-answer", () => {
  // Cria uma proposta fresca antes de cada teste para evitar que afterEach a delete
  async function createAwaitingProposal(jobId = "job-e2e-answer-test") {
    return prisma.proposal.create({
      data: {
        title: "Proposta E2E Aguardando",
        ownerId,
        leadId,
        status: "draft",
        agentJobId: jobId,
        agentStatus: "awaiting_answer",
        agentCurrentQuestion: "Qual o prazo esperado para o projeto?",
      },
    });
  }

  it("retorna 401 sem token", async () => {
    const p = await createAwaitingProposal();
    await request(app.getHttpServer())
      .post(`/proposals/${p.id}/agent-answer`)
      .send({ answer: "30 dias" })
      .expect(401);
  });

  it("retorna 400 sem answer", async () => {
    const p = await createAwaitingProposal();
    await request(app.getHttpServer())
      .post(`/proposals/${p.id}/agent-answer`)
      .set("Authorization", `Bearer ${token}`)
      .send({})
      .expect(400);
  });

  it("retorna 404 para proposta inexistente", async () => {
    await request(app.getHttpServer())
      .post("/proposals/nonexistent/agent-answer")
      .set("Authorization", `Bearer ${token}`)
      .send({ answer: "30 dias" })
      .expect(404);
  });

  it("retorna 403 se outro usuário tentar responder", async () => {
    const p = await createAwaitingProposal("job-e2e-403-test");
    await request(app.getHttpServer())
      .post(`/proposals/${p.id}/agent-answer`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ answer: "30 dias" })
      .expect(403);
  });

  it("envia resposta com sucesso e atualiza status para processing", async () => {
    const p = await createAwaitingProposal("job-e2e-success-test");
    const res = await request(app.getHttpServer())
      .post(`/proposals/${p.id}/agent-answer`)
      .set("Authorization", `Bearer ${token}`)
      .send({ answer: "30 dias corridos" })
      .expect(200);

    expect(res.body.ok).toBe(true);

    const updated = await prisma.proposal.findUnique({ where: { id: p.id } });
    expect(updated!.agentStatus).toBe("processing");
    expect(updated!.agentCurrentQuestion).toBeNull();
  });
});

// ─── POST /webhooks/proposal-agent ────────────────────────────────────────────
describe("POST /webhooks/proposal-agent", () => {
  let proposalId: string;
  let agentJobId: string;

  beforeEach(async () => {
    // Cria uma proposta fresca antes de cada teste de webhook
    agentJobId = `job-webhook-e2e-${Date.now()}`;
    const p = await prisma.proposal.create({
      data: {
        title: "Proposta Webhook E2E",
        ownerId,
        leadId,
        status: "draft",
        agentJobId,
        agentStatus: "processing",
      },
    });
    proposalId = p.id;
  });

  it("retorna 403 sem secret", async () => {
    await request(app.getHttpServer())
      .post("/webhooks/proposal-agent")
      .send({ jobId: agentJobId, status: "question", question: "Qual o prazo?" })
      .expect(403);
  });

  it("aceita webhook com header x-webhook-secret correto", async () => {
    const res = await request(app.getHttpServer())
      .post("/webhooks/proposal-agent")
      .set("x-webhook-secret", INTERNAL_SECRET)
      .send({ jobId: agentJobId, status: "question", question: "Qual o prazo?" })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.queued).toBe(true);
  });

  it("aceita webhook com x-internal-api-key", async () => {
    process.env.INTERNAL_API_KEY = "test-internal-key-e2e";
    const res = await request(app.getHttpServer())
      .post("/webhooks/proposal-agent")
      .set("x-internal-api-key", "test-internal-key-e2e")
      .send({ jobId: agentJobId, status: "question", question: "Q?" })
      .expect(200);

    expect(res.body.ok).toBe(true);
  });

  it("atualiza proposta para awaiting_answer via webhook de pergunta (com delay do setImmediate)", async () => {
    const jobId = "job-question-e2e-002";
    const created = await prisma.proposal.create({
      data: { title: "Proposta Pergunta E2E", ownerId, leadId, status: "draft", agentJobId: jobId, agentStatus: "processing" },
    });

    await request(app.getHttpServer())
      .post("/webhooks/proposal-agent")
      .set("x-webhook-secret", INTERNAL_SECRET)
      .send({ jobId, status: "question", question: "Qual o orçamento disponível?" })
      .expect(200);

    // Aguarda processamento assíncrono do setImmediate
    await new Promise((r) => setTimeout(r, 200));

    const updated = await prisma.proposal.findUnique({ where: { id: created.id } });
    expect(updated!.agentStatus).toBe("awaiting_answer");
    expect(updated!.agentCurrentQuestion).toBe("Qual o orçamento disponível?");
  });

  it("atualiza proposta para completed via webhook com arquivo Drive", async () => {
    const jobId = "job-completed-e2e-003";
    const created = await prisma.proposal.create({
      data: { title: "Proposta Completada E2E", ownerId, leadId, status: "draft", agentJobId: jobId, agentStatus: "processing" },
    });

    await request(app.getHttpServer())
      .post("/webhooks/proposal-agent")
      .set("x-webhook-secret", INTERNAL_SECRET)
      .send({
        jobId,
        proposalId: created.id,
        status: "completed",
        driveFileId: "drive-file-e2e-001",
        driveUrl: "https://drive.google.com/file/d/e2e-001",
        fileName: "proposta_empresa.pdf",
        fileSize: 204800,
      })
      .expect(200);

    await new Promise((r) => setTimeout(r, 200));

    const updated = await prisma.proposal.findUnique({ where: { id: created.id } });
    expect(updated!.agentStatus).toBe("completed");
    expect(updated!.agentCurrentQuestion).toBeNull();
    expect(updated!.driveFileId).toBe("drive-file-e2e-001");
    expect(updated!.driveUrl).toBe("https://drive.google.com/file/d/e2e-001");
    expect(updated!.fileName).toBe("proposta_empresa.pdf");
  });

  it("faz upload no Drive via fileBase64 e salva driveFileId", async () => {
    const jobId = "job-base64-e2e-005";
    const created = await prisma.proposal.create({
      data: { title: "Proposta Base64 E2E", ownerId, leadId, status: "draft", agentJobId: jobId, agentStatus: "processing" },
    });

    const fakeBase64 = Buffer.from("%PDF-1.4 fake content").toString("base64");

    await request(app.getHttpServer())
      .post("/webhooks/proposal-agent")
      .set("x-webhook-secret", INTERNAL_SECRET)
      .send({ jobId, proposalId: created.id, status: "completed", fileBase64: fakeBase64, fileName: "proposta_e2e.pdf" })
      .expect(200);

    await new Promise((r) => setTimeout(r, 300));

    const updated = await prisma.proposal.findUnique({ where: { id: created.id } });
    expect(updated!.agentStatus).toBe("completed");
    expect(updated!.driveFileId).toBe("fake-drive-id-e2e");
    expect(updated!.driveUrl).toContain("fake-drive-id-e2e");
    expect(updated!.fileName).toBe("proposta_e2e.pdf");
  });

  it("atualiza proposta para error via webhook de erro", async () => {
    const jobId = "job-error-e2e-004";
    const created = await prisma.proposal.create({
      data: { title: "Proposta Erro E2E", ownerId, leadId, status: "draft", agentJobId: jobId, agentStatus: "processing" },
    });

    await request(app.getHttpServer())
      .post("/webhooks/proposal-agent")
      .set("x-webhook-secret", INTERNAL_SECRET)
      .send({ jobId, status: "error", errorMessage: "timeout na geração" })
      .expect(200);

    await new Promise((r) => setTimeout(r, 200));

    const updated = await prisma.proposal.findUnique({ where: { id: created.id } });
    expect(updated!.agentStatus).toBe("error");
  });

  it("retorna ok mesmo quando jobId não existe (processado async)", async () => {
    const res = await request(app.getHttpServer())
      .post("/webhooks/proposal-agent")
      .set("x-webhook-secret", INTERNAL_SECRET)
      .send({ jobId: "job-inexistente-e2e", status: "completed" })
      .expect(200);

    expect(res.body.ok).toBe(true);
  });
});

// ─── GET /proposals/:id inclui campos do agente ───────────────────────────────
describe("GET /proposals/:id retorna campos do agente", () => {
  it("retorna agentStatus e agentCurrentQuestion na resposta", async () => {
    const p = await prisma.proposal.create({
      data: {
        title: "Proposta Com Campos Agente",
        ownerId,
        leadId,
        status: "draft",
        agentJobId: "job-fields-test",
        agentStatus: "awaiting_answer",
        agentCurrentQuestion: "Qual o prazo?",
      },
    });

    const res = await request(app.getHttpServer())
      .get(`/proposals/${p.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.agentJobId).toBe("job-fields-test");
    expect(res.body.agentStatus).toBe("awaiting_answer");
    expect(res.body.agentCurrentQuestion).toBe("Qual o prazo?");
  });
});
