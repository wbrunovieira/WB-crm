/**
 * O webhook do WhatsApp cria ATIVIDADE de verdade — não só responde 200.
 *
 * Spec separado de whatsapp-webhook.e2e-spec.ts de propósito: aquele substitui o
 * PhoneMatcherService por um fake que nunca casa ("no match → ignored"), o que é certo para
 * testar validação de secret e filtro de evento, mas impede justamente o que aqui se quer
 * provar. Este roda com o matcher REAL contra um lead REAL.
 *
 * Motivo de existir: o CRM parou de receber mensagens em 12/07/2026 e ninguém percebeu, porque
 * a corrente Evolution → n8n → CRM foi rompida sem erro em lugar nenhum — descobriu-se que o
 * workflow do n8n nem tinha nó apontando para o CRM. Ao trocar por um webhook por instância,
 * apontando a Evolution direto para cá, este teste é o que garante que o payload NATIVO da
 * Evolution (sem passar pelo n8n) produz o efeito esperado.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";

const WEBHOOK_SECRET = "e2e-activity-secret";

let app: INestApplication;
let prisma: PrismaService;
let ownerId: string;

beforeAll(async () => {
  process.env.EVOLUTION_WEBHOOK_SECRET = WEBHOOK_SECRET;
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleFixture.createNestApplication();
  await app.init();
  prisma = moduleFixture.get(PrismaService);

  const user = await prisma.user.upsert({
    where: { email: "e2e-wh-activity@test.com" },
    update: {},
    create: { email: "e2e-wh-activity@test.com", name: "E2E WH Activity", password: "x", role: "admin" },
  });
  ownerId = user.id;
  // O webhook é público (sem JWT), então descobre o dono por esta variável. Sem ela o matcher
  // procura leads de um owner vazio, não acha nada e a mensagem é descartada em silêncio —
  // exatamente o que acontece em produção se ela não estiver no container.
  process.env.EVOLUTION_DEFAULT_OWNER_ID = user.id;
  // Self-clean no início: o banco de dev é compartilhado.
  await prisma.activity.deleteMany({ where: { ownerId } });
  await prisma.lead.deleteMany({ where: { ownerId } });
});

afterAll(async () => {
  await prisma.activity.deleteMany({ where: { ownerId } });
  await prisma.lead.deleteMany({ where: { ownerId } });
  await prisma.user.deleteMany({ where: { id: ownerId } });
  await app.close();
});

describe("Webhook do WhatsApp → atividade no CRM (e2e)", () => {
  it("mensagem de um lead conhecido vira registro E atividade", async () => {
    const phone = "+5521987650001";
    const lead = await prisma.lead.create({
      data: { ownerId, businessName: "Lead Que Mandou Mensagem", phone },
    });
    const messageId = `msg-activity-${Date.now()}`;

    await request(app.getHttpServer())
      .post("/webhooks/whatsapp")
      .set("x-webhook-secret", WEBHOOK_SECRET)
      .send({
        // Formato nativo da Evolution — é este que chega quando o webhook aponta direto.
        event: "messages.upsert",
        instance: "wbdigital",
        data: {
          key: { id: messageId, fromMe: false, remoteJid: "5521987650001@s.whatsapp.net" },
          pushName: "Cliente Teste",
          messageType: "conversation",
          message: { conversation: "Oi, quero saber do orçamento" },
          messageTimestamp: Math.floor(Date.now() / 1000),
        },
      })
      .expect(200);

    try {
      const saved = await prisma.whatsAppMessage.findFirst({ where: { messageId } });
      expect(saved, "a mensagem não foi gravada").not.toBeNull();
      expect(saved!.text).toContain("orçamento");

      const activities = await prisma.activity.findMany({ where: { leadId: lead.id } });
      expect(activities.length, "nenhuma atividade criada para o lead").toBeGreaterThan(0);
      expect(activities[0].type).toBe("whatsapp");
    } finally {
      await prisma.whatsAppMessage.deleteMany({ where: { messageId } });
    }
  });

  it("a mesma mensagem duas vezes não duplica (idempotência por messageId)", async () => {
    // A Evolution reenvia em caso de falha de entrega do webhook; sem isso, cada reenvio
    // viraria uma atividade nova.
    const phone = "+5521987650002";
    const lead = await prisma.lead.create({
      data: { ownerId, businessName: "Lead Reenvio", phone },
    });
    const messageId = `msg-dup-${Date.now()}`;
    const payload = {
      event: "messages.upsert",
      instance: "wbdigital",
      data: {
        key: { id: messageId, fromMe: false, remoteJid: "5521987650002@s.whatsapp.net" },
        pushName: "Cliente Reenvio",
        messageType: "conversation",
        message: { conversation: "mensagem repetida" },
        messageTimestamp: Math.floor(Date.now() / 1000),
      },
    };

    for (const _ of [1, 2]) {
      await request(app.getHttpServer())
        .post("/webhooks/whatsapp")
        .set("x-webhook-secret", WEBHOOK_SECRET)
        .send(payload)
        .expect(200);
    }

    try {
      const msgs = await prisma.whatsAppMessage.findMany({ where: { messageId } });
      expect(msgs.length, "mensagem duplicada").toBe(1);

      const activities = await prisma.activity.findMany({ where: { leadId: lead.id } });
      expect(activities.length, "atividade duplicada").toBe(1);
    } finally {
      await prisma.whatsAppMessage.deleteMany({ where: { messageId } });
    }
  });
});
