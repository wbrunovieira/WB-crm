/**
 * Ordem manual das atividades da organização, pela HTTP real.
 *
 * O unitário prova a decisão; este prova que a rota existe e que o Nest resolve as duas use
 * cases novas — coisa que fake nenhum exercita. Autolimpeza no início: banco de dev é
 * compartilhado e execução interrompida deixa resíduo.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";

const EMAIL = "e2e-org-activity-order@test.com";

let app: INestApplication;
let prisma: PrismaService;
let token: string;
let ownerId: string;

async function limpar() {
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
    create: { email: EMAIL, name: "E2E Order", password: "hashed", role: "admin" },
  });
  ownerId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
  await limpar();
});

beforeEach(limpar);

afterAll(async () => {
  await limpar();
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await app.close();
});

const criarOrg = () =>
  prisma.organization.create({ data: { ownerId, name: `E2E Ordem ${Date.now()}` } });

describe("PATCH/DELETE /organizations/:id/activity-order", () => {
  it("grava a ordem escolhida e devolve no detalhe", async () => {
    const org = await criarOrg();

    await request(app.getHttpServer())
      .patch(`/organizations/${org.id}/activity-order`)
      .set("Authorization", `Bearer ${token}`)
      .send({ activityIds: ["a-2", "a-1", "a-3"] })
      .expect(204);

    const salva = await prisma.organization.findUnique({ where: { id: org.id } });
    expect(salva?.activityOrder).toBe(JSON.stringify(["a-2", "a-1", "a-3"]));
  });

  it("reseta para a ordem padrão", async () => {
    const org = await prisma.organization.create({
      data: { ownerId, name: `E2E Reset ${Date.now()}`, activityOrder: JSON.stringify(["a-1"]) },
    });

    await request(app.getHttpServer())
      .delete(`/organizations/${org.id}/activity-order`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    const salva = await prisma.organization.findUnique({ where: { id: org.id } });
    expect(salva?.activityOrder).toBeNull();
  });

  it("recusa lista vazia", async () => {
    const org = await criarOrg();

    await request(app.getHttpServer())
      .patch(`/organizations/${org.id}/activity-order`)
      .set("Authorization", `Bearer ${token}`)
      .send({ activityIds: [] })
      .expect((res) => expect(res.status).toBeGreaterThanOrEqual(400));
  });

  it("exige autenticação", async () => {
    const org = await criarOrg();

    await request(app.getHttpServer())
      .patch(`/organizations/${org.id}/activity-order`)
      .send({ activityIds: ["a-1"] })
      .expect(401);
  });
});
