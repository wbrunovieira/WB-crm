import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";

describe("Lead activities include GoTo fields (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: string;
  let leadId: string;
  let activityId: string;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    const jwt = moduleFixture.get(JwtService);

    // Seed: user → lead → activity with GoTo fields
    const user = await prisma.user.create({
      data: { name: "Teste GoTo", email: `goto-e2e-${Date.now()}@test.com`, password: "x", role: "admin" },
    });
    userId = user.id;
    token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });

    const lead = await prisma.lead.create({
      data: { businessName: "Empresa Goto Test", ownerId: userId, status: "new" },
    });
    leadId = lead.id;

    const activity = await prisma.activity.create({
      data: {
        type: "call",
        subject: "Ligação teste goto",
        completed: true,
        completedAt: new Date(),
        ownerId: userId,
        leadId: leadId,
        gotoCallId: "call-abc-123",
        gotoCallOutcome: "answered",
        gotoDuration: 70,
        gotoRecordingUrl: "2026/04/23/agent.mp3",
        gotoRecordingUrl2: "2026/04/23/client.mp3",
        gotoTranscriptText: JSON.stringify([{ start: 0, end: 5, text: "Olá", speaker: "agent", speakerName: "Bruno" }]),
      },
    });
    activityId = activity.id;
  });

  afterAll(async () => {
    await prisma.activity.deleteMany({ where: { leadId } });
    await prisma.lead.delete({ where: { id: leadId } });
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  it("GET /leads/:id returns activities with gotoTranscriptText and gotoRecordingUrl", async () => {
    const res = await request(app.getHttpServer())
      .get(`/leads/${leadId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);

    const act = (res.body.activities as Array<Record<string, unknown>>).find(
      (a) => a.id === activityId,
    );

    expect(act).toBeDefined();
    expect(act?.gotoTranscriptText).toBeTruthy();
    expect(act?.gotoRecordingUrl).toBe("2026/04/23/agent.mp3");
    expect(act?.gotoCallOutcome).toBe("answered");
    expect(act?.gotoDuration).toBe(70);
  });
});
