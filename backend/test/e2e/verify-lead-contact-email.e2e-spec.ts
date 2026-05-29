import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { EmailVerifierPort } from "@/domain/integrations/email/application/ports/email-verifier.port";

const OWNER_ID = "e2e-vlce-owner";
const LEAD_ID = "e2e-vlce-lead";
const CONTACT_ID = "e2e-vlce-contact";
const CONTACT_NO_EMAIL_ID = "e2e-vlce-contact-noemail";
// A second owner's data — used to assert cross-owner access is denied
const FOREIGN_OWNER_ID = "e2e-vlce-foreign-owner";
const FOREIGN_LEAD_ID = "e2e-vlce-foreign-lead";
const FOREIGN_CONTACT_ID = "e2e-vlce-foreign-contact";

// Deterministic verifier — picks its verdict from the email domain
const fakeVerifier = {
  verify: async (email: string) => {
    if (email.includes("@invalid.")) return { valid: false, status: "invalid", reason: "Domínio sem MX" };
    if (email.includes("@risky.")) return { valid: true, status: "risky", reason: "Catch-all" };
    if (email.includes("@blank.")) return { valid: false, status: "invalid", reason: "   " }; // empty reason
    return { valid: true, status: "valid", reason: "Email válido" };
  },
};

describe("POST /email/verify/lead-contact/:id (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailVerifierPort)
      .useValue(fakeVerifier)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    const jwt = moduleFixture.get(JwtService);

    await prisma.user.upsert({
      where: { id: OWNER_ID },
      update: {},
      create: { id: OWNER_ID, email: "e2e-vlce@test.com", name: "E2E VLCE", password: "hashed", role: "sdr" },
    });
    await prisma.lead.upsert({
      where: { id: LEAD_ID },
      update: {},
      create: { id: LEAD_ID, businessName: "Lead VLCE", ownerId: OWNER_ID },
    });
    await prisma.leadContact.upsert({
      where: { id: CONTACT_ID },
      update: { email: "valido@empresa.com", emailVerified: null, emailVerificationStatus: null },
      create: { id: CONTACT_ID, leadId: LEAD_ID, name: "Contato Com Email", email: "valido@empresa.com" },
    });
    await prisma.leadContact.upsert({
      where: { id: CONTACT_NO_EMAIL_ID },
      update: { email: null },
      create: { id: CONTACT_NO_EMAIL_ID, leadId: LEAD_ID, name: "Contato Sem Email", email: null },
    });

    // Second owner + their lead/contact (for the cross-owner 403 case)
    await prisma.user.upsert({
      where: { id: FOREIGN_OWNER_ID },
      update: {},
      create: { id: FOREIGN_OWNER_ID, email: "e2e-vlce-foreign@test.com", name: "Foreign", password: "hashed", role: "sdr" },
    });
    await prisma.lead.upsert({
      where: { id: FOREIGN_LEAD_ID },
      update: {},
      create: { id: FOREIGN_LEAD_ID, businessName: "Foreign Lead", ownerId: FOREIGN_OWNER_ID },
    });
    await prisma.leadContact.upsert({
      where: { id: FOREIGN_CONTACT_ID },
      update: { email: "x@foreign.test" },
      create: { id: FOREIGN_CONTACT_ID, leadId: FOREIGN_LEAD_ID, name: "Foreign Contact", email: "x@foreign.test" },
    });

    token = jwt.sign({ sub: OWNER_ID, name: "E2E VLCE", email: "e2e-vlce@test.com", role: "sdr" });
  });

  afterAll(async () => {
    await prisma.leadContact.deleteMany({ where: { leadId: { in: [LEAD_ID, FOREIGN_LEAD_ID] } } });
    await prisma.lead.deleteMany({ where: { id: { in: [LEAD_ID, FOREIGN_LEAD_ID] } } });
    await prisma.user.deleteMany({ where: { id: { in: [OWNER_ID, FOREIGN_OWNER_ID] } } });
    await app.close();
  });

  it("rejects unauthenticated requests with 401", async () => {
    await request(app.getHttpServer()).post(`/email/verify/lead-contact/${CONTACT_ID}`).expect(401);
  });

  it("verifies a valid contact email and persists the result", async () => {
    const res = await request(app.getHttpServer())
      .post(`/email/verify/lead-contact/${CONTACT_ID}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.valid).toBe(true);
    expect(res.body.status).toBe("valid");
    expect(res.body.email).toBe("valido@empresa.com");

    const saved = await prisma.leadContact.findUnique({ where: { id: CONTACT_ID } });
    expect(saved?.emailVerified).toBe(true);
    expect(saved?.emailVerificationStatus).toBe("valid");
    expect(saved?.emailVerificationReason).toBe("Email válido");
    expect(saved?.emailVerifiedAt).toBeInstanceOf(Date);
  });

  it("persists an invalid verdict when the verifier says so", async () => {
    await prisma.leadContact.update({ where: { id: CONTACT_ID }, data: { email: "x@invalid.test" } });

    const res = await request(app.getHttpServer())
      .post(`/email/verify/lead-contact/${CONTACT_ID}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.valid).toBe(false);
    expect(res.body.status).toBe("invalid");

    const saved = await prisma.leadContact.findUnique({ where: { id: CONTACT_ID } });
    expect(saved?.emailVerified).toBe(false);
    expect(saved?.emailVerificationStatus).toBe("invalid");
  });

  it("returns 422 when the contact has no email", async () => {
    await request(app.getHttpServer())
      .post(`/email/verify/lead-contact/${CONTACT_NO_EMAIL_ID}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(422);
  });

  it("returns 403 when the requester does not own the parent lead", async () => {
    await request(app.getHttpServer())
      .post(`/email/verify/lead-contact/${FOREIGN_CONTACT_ID}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  it("returns 404 when the contact does not exist", async () => {
    await request(app.getHttpServer())
      .post(`/email/verify/lead-contact/does-not-exist`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("persists a 'risky' verdict through the real controller (200)", async () => {
    await prisma.leadContact.update({ where: { id: CONTACT_ID }, data: { email: "c@risky.test" } });

    const res = await request(app.getHttpServer())
      .post(`/email/verify/lead-contact/${CONTACT_ID}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.status).toBe("risky");
    const saved = await prisma.leadContact.findUnique({ where: { id: CONTACT_ID } });
    expect(saved?.emailVerificationStatus).toBe("risky");
  });

  it("synthesizes a non-empty reason when the verifier returns a blank reason", async () => {
    await prisma.leadContact.update({ where: { id: CONTACT_ID }, data: { email: "c@blank.test" } });

    const res = await request(app.getHttpServer())
      .post(`/email/verify/lead-contact/${CONTACT_ID}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect((res.body.reason as string).trim().length).toBeGreaterThan(0);
    const saved = await prisma.leadContact.findUnique({ where: { id: CONTACT_ID } });
    expect((saved?.emailVerificationReason ?? "").trim().length).toBeGreaterThan(0);
  });

  // ── Sibling endpoint: POST /email/verify/lead/:id ──────────────────────────────

  it("verifies the owner's lead email and persists the result (200)", async () => {
    await prisma.lead.update({ where: { id: LEAD_ID }, data: { email: "lead@empresa.com" } });

    const res = await request(app.getHttpServer())
      .post(`/email/verify/lead/${LEAD_ID}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.valid).toBe(true);
    const saved = await prisma.lead.findUnique({ where: { id: LEAD_ID } });
    expect(saved?.emailVerified).toBe(true);
    expect(saved?.emailVerificationStatus).toBe("valid");
  });

  it("denies verifying a lead owned by someone else (403)", async () => {
    await prisma.lead.update({ where: { id: FOREIGN_LEAD_ID }, data: { email: "x@empresa.com" } });

    await request(app.getHttpServer())
      .post(`/email/verify/lead/${FOREIGN_LEAD_ID}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  it("returns 422 when the lead has no email", async () => {
    await prisma.lead.update({ where: { id: LEAD_ID }, data: { email: null } });

    await request(app.getHttpServer())
      .post(`/email/verify/lead/${LEAD_ID}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(422);
  });

  it("returns 404 when the lead does not exist", async () => {
    await request(app.getHttpServer())
      .post(`/email/verify/lead/ghost-lead`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });
});
