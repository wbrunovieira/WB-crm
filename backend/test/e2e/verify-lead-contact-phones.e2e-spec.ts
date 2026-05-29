import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { PhoneValidatorPort } from "@/domain/integrations/phone/application/ports/phone-validator.port";

const OWNER_ID = "e2e-vlcp-owner";
const FOREIGN_OWNER_ID = "e2e-vlcp-foreign";
const LEAD_ID = "e2e-vlcp-lead";
const FOREIGN_LEAD_ID = "e2e-vlcp-foreign-lead";
const CONTACT_ID = "e2e-vlcp-contact";
const FOREIGN_CONTACT_ID = "e2e-vlcp-foreign-contact";
const NO_PHONE_CONTACT_ID = "e2e-vlcp-nophone";

const fakeValidator = { validate: () => ({ valid: true, type: "MOBILE", country: "BR" }) };

describe("POST /phone/verify/lead-contact/:id (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PhoneValidatorPort).useValue(fakeValidator)
      .compile();
    app = mod.createNestApplication();
    await app.init();
    prisma = mod.get(PrismaService);
    const jwt = mod.get(JwtService);

    await prisma.user.upsert({ where: { id: OWNER_ID }, update: {}, create: { id: OWNER_ID, email: "e2e-vlcp@test.com", name: "O", password: "h", role: "sdr" } });
    await prisma.user.upsert({ where: { id: FOREIGN_OWNER_ID }, update: {}, create: { id: FOREIGN_OWNER_ID, email: "e2e-vlcp-f@test.com", name: "F", password: "h", role: "sdr" } });
    await prisma.lead.upsert({ where: { id: LEAD_ID }, update: {}, create: { id: LEAD_ID, businessName: "Lead", ownerId: OWNER_ID } });
    await prisma.lead.upsert({ where: { id: FOREIGN_LEAD_ID }, update: {}, create: { id: FOREIGN_LEAD_ID, businessName: "Foreign Lead", ownerId: FOREIGN_OWNER_ID } });
    await prisma.leadContact.upsert({ where: { id: CONTACT_ID }, update: { phone: "+5511999998888", phoneValid: null }, create: { id: CONTACT_ID, leadId: LEAD_ID, name: "Com Fone", phone: "+5511999998888" } });
    await prisma.leadContact.upsert({ where: { id: NO_PHONE_CONTACT_ID }, update: { phone: null }, create: { id: NO_PHONE_CONTACT_ID, leadId: LEAD_ID, name: "Sem Fone", phone: null } });
    await prisma.leadContact.upsert({ where: { id: FOREIGN_CONTACT_ID }, update: { phone: "+5511888887777" }, create: { id: FOREIGN_CONTACT_ID, leadId: FOREIGN_LEAD_ID, name: "Foreign", phone: "+5511888887777" } });

    token = jwt.sign({ sub: OWNER_ID, name: "O", email: "e2e-vlcp@test.com", role: "sdr" });
  });

  afterAll(async () => {
    await prisma.leadContact.deleteMany({ where: { leadId: { in: [LEAD_ID, FOREIGN_LEAD_ID] } } });
    await prisma.lead.deleteMany({ where: { id: { in: [LEAD_ID, FOREIGN_LEAD_ID] } } });
    await prisma.user.deleteMany({ where: { id: { in: [OWNER_ID, FOREIGN_OWNER_ID] } } });
    await app.close();
  });

  it("requires authentication", async () => {
    await request(app.getHttpServer()).post(`/phone/verify/lead-contact/${CONTACT_ID}`).expect(401);
  });

  it("validates the contact's phone and persists the result", async () => {
    const res = await request(app.getHttpServer())
      .post(`/phone/verify/lead-contact/${CONTACT_ID}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.phone.valid).toBe(true);

    const saved = await prisma.leadContact.findUnique({ where: { id: CONTACT_ID } });
    expect(saved?.phoneValid).toBe(true);
    expect(saved?.phoneType).toBe("MOBILE");
  });

  it("returns 200 with no phone result when the contact has no phone", async () => {
    const res = await request(app.getHttpServer())
      .post(`/phone/verify/lead-contact/${NO_PHONE_CONTACT_ID}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.phone).toBeUndefined();
  });

  it("returns 403 when the requester does not own the parent lead", async () => {
    await request(app.getHttpServer())
      .post(`/phone/verify/lead-contact/${FOREIGN_CONTACT_ID}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  it("returns 404 when the contact does not exist", async () => {
    await request(app.getHttpServer())
      .post(`/phone/verify/lead-contact/does-not-exist`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });
});
