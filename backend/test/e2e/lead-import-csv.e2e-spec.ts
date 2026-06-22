import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { readFileSync } from "fs";
import { join } from "path";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { normalizePhoneE164 } from "@/infra/shared/phone/phone-normalizer";

let app: INestApplication;
let prisma: PrismaService;
let jwt: JwtService;
let token: string;
let ownerId: string;

// ── Minimal CSV parser (quotes + comma), tolerant of short trailing rows ──────
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter(l => l.trim() !== "");
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
        } else cur += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out;
  };
  const headers = parseLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (values[i] ?? "").trim(); });
    return row;
  });
}

// Coerce CSV strings into the typed ImportLeadRowData the frontend would POST.
function toImportRow(r: Record<string, string>): Record<string, unknown> {
  const s = (v?: string) => (v && v.trim() ? v.trim() : undefined);
  const bool = (v?: string) =>
    !v || !v.trim() ? undefined : ["true", "1", "sim", "yes"].includes(v.trim().toLowerCase());
  const num = (v?: string) => (v && v.trim() ? Number(v) : undefined);
  return {
    businessName: s(r.businessName),
    registeredName: s(r.registeredName),
    companyRegistrationID: s(r.companyRegistrationID),
    foundationDate: s(r.foundationDate),
    businessStatus: s(r.businessStatus),
    legalNature: s(r.legalNature),
    branchType: s(r.branchType),
    simplesNacional: bool(r.simplesNacional),
    isMei: bool(r.isMei),
    email: s(r.email),
    phone: s(r.phone),
    phone2: s(r.phone2),
    whatsapp: s(r.whatsapp),
    website: s(r.website),
    address: s(r.address),
    vicinity: s(r.vicinity),
    city: s(r.city),
    state: s(r.state),
    country: s(r.country),
    zipCode: s(r.zipCode),
    instagram: s(r.instagram),
    linkedin: s(r.linkedin),
    facebook: s(r.facebook),
    twitter: s(r.twitter),
    tiktok: s(r.tiktok),
    companyOwner: s(r.companyOwner),
    companySize: s(r.companySize),
    revenue: num(r.revenue),
    revenueRange: s(r.revenueRange),
    equityCapital: num(r.equityCapital),
    employeesCount: num(r.employeesCount),
    description: s(r.description),
    segment: s(r.segment),
    source: s(r.source),
    quality: s(r.quality),
    searchTerm: s(r.searchTerm),
    sourceGroup: s(r.sourceGroup),
    cnaePrincipal: s(r.cnaePrincipal),
    cnaesSecundarios: s(r.cnaesSecundarios),
    contactName: s(r.contactName),
    contactRole: s(r.contactRole),
    contactEmail: s(r.contactEmail),
    contactPhone: s(r.contactPhone),
    contactWhatsapp: s(r.contactWhatsapp),
    contactLinkedin: s(r.contactLinkedin),
    contactInstagram: s(r.contactInstagram),
  };
}

const NAMES = ["Pousada Serra Azul", "Hotel Petro Vista", "Camping Vale Verde"];
const PHONE_NAMES = [
  "Tel Variante DDI", "Tel Sem Mais", "Tel Sem Pais", "Tel Formatado",
  "Tel Tronco Zero", "Tel Formatado DDI", "Tel Fixo",
];
const FAKE_CNAE_CODES = ["9990001", "9990002", "9990003"];

async function cleanup() {
  const allNames = [...NAMES, ...PHONE_NAMES];
  await prisma.leadSecondaryCNAE.deleteMany({ where: { lead: { ownerId } } });
  await prisma.leadContact.deleteMany({ where: { lead: { ownerId, businessName: { in: allNames } } } });
  await prisma.lead.deleteMany({ where: { ownerId, businessName: { in: allNames } } });
  await prisma.cNAE.deleteMany({ where: { code: { in: FAKE_CNAE_CODES } } });
}

beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication();
  await app.init();
  prisma = module.get(PrismaService);
  jwt = module.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: "e2e-lead-import-csv@test.com" },
    update: {},
    create: { email: "e2e-lead-import-csv@test.com", name: "E2E CSV User", password: "hashed", role: "sdr" },
  });
  ownerId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await prisma.user.deleteMany({ where: { email: "e2e-lead-import-csv@test.com" } });
  await app.close();
});

describe("POST /lead-import — CSV real (todos os campos persistem)", () => {
  it("importa uma planilha CSV real e grava TODOS os campos no banco", async () => {
    const csv = readFileSync(join(process.cwd(), "test/fixtures/lead-import/leads-sample.csv"), "utf8");
    const rows = parseCsv(csv).map(toImportRow);
    expect(rows).toHaveLength(3);

    const res = await request(app.getHttpServer())
      .post("/lead-import")
      .set("Authorization", `Bearer ${token}`)
      .send({ rows })
      .expect(201);

    expect(res.body.imported).toBe(3);
    expect(res.body.errors).toHaveLength(0);

    // ── Row 1: fully populated — assert EVERY persisted column ───────────────
    const full = await prisma.lead.findFirst({ where: { ownerId, businessName: "Pousada Serra Azul" } });
    expect(full).toBeTruthy();
    expect(full!.registeredName).toBe("Pousada Serra Azul LTDA");
    expect(full!.companyRegistrationID).toBe("12345678000190");
    expect(full!.foundationDate?.toISOString().startsWith("2018-07-12")).toBe(true);
    expect(full!.businessStatus).toBe("ATIVA");
    expect(full!.legalNature).toBe("Sociedade Empresária Limitada");
    expect(full!.branchType).toBe("Matriz");
    expect(full!.simplesNacional).toBe(true);
    expect(full!.isMei).toBe(false);
    expect(full!.email).toBe("contato@serraazul.com.br");
    expect(full!.phone).toBe(normalizePhoneE164("+552422435397"));
    expect(full!.phone2).toBe(normalizePhoneE164("+552422435398"));
    expect(full!.whatsapp).toBe(normalizePhoneE164("+5524999998888"));
    expect(full!.website).toBe("https://serraazul.com.br");
    expect(full!.address).toBe("Rua das Hortênsias 100");
    expect(full!.vicinity).toBe("Centro");
    expect(full!.city).toBe("Petrópolis");
    expect(full!.state).toBe("RJ");
    expect(full!.country).toBe("Brasil");
    expect(full!.zipCode).toBe("25680-000");
    expect(full!.instagram).toBe("@serraazul");
    expect(full!.linkedin).toBe("https://linkedin.com/company/serraazul");
    expect(full!.facebook).toBe("https://facebook.com/serraazul");
    expect(full!.twitter).toBe("https://x.com/serraazul");
    expect(full!.tiktok).toBe("https://tiktok.com/@serraazul");
    expect(full!.companyOwner).toBe("João Tannure");
    expect(full!.companySize).toBe("Médio");
    expect(full!.revenue).toBe(150000.5);
    expect(full!.revenueRange).toBe("De R$ 81k a R$ 360k");
    expect(full!.equityCapital).toBe(50000);
    expect(full!.employeesCount).toBe(12);
    expect(full!.description).toBe("Pousada boutique na serra, com 20 quartos");
    expect(full!.segment).toBe("Turismo");
    expect(full!.source).toBe("csv");
    expect(full!.quality).toBe("warm");
    expect(full!.searchTerm).toBe("pousadas petropolis");
    // THE regression field:
    expect(full!.sourceGroup).toBe("petropolisTeresopolisJun2026Lote2");
    expect(full!.primaryCNAEId).toBeTruthy();

    // Primary CNAE + 2 secondaries
    const primary = await prisma.cNAE.findUnique({ where: { id: full!.primaryCNAEId! } });
    expect(primary!.code).toBe("9990001");
    const secondaries = await prisma.leadSecondaryCNAE.findMany({
      where: { leadId: full!.id }, include: { cnae: true },
    });
    expect(secondaries.map(s => s.cnae.code).sort()).toEqual(["9990002", "9990003"]);

    // Primary contact created from the contact* columns
    const contacts = await prisma.leadContact.findMany({ where: { leadId: full!.id } });
    const tiago = contacts.find(c => c.name === "Tiago Tannure");
    expect(tiago).toBeTruthy();
    expect(tiago!.role).toBe("Proprietário");
    expect(tiago!.email).toBe("tiago@serraazul.com.br");
    expect(tiago!.phone).toBe(normalizePhoneE164("+5524999990001"));
    expect(tiago!.linkedin).toBe("https://linkedin.com/in/tiagotannure");
    expect(tiago!.instagram).toBe("@tiagotannure");
    expect(tiago!.isPrimary).toBe(true);

    // ── Row 2: shares the same NEW CNAE — race-safe, same id, no duplicate ───
    const shared = await prisma.lead.findFirst({ where: { ownerId, businessName: "Hotel Petro Vista" } });
    expect(shared!.sourceGroup).toBe("petropolisTeresopolisJun2026Lote2");
    expect(shared!.primaryCNAEId).toBe(full!.primaryCNAEId); // same CNAE row
    const cnaeRows = await prisma.cNAE.findMany({ where: { code: "9990001" } });
    expect(cnaeRows).toHaveLength(1);

    // ── Row 3: minimal — sourceGroup still persists, no CNAE ─────────────────
    const minimal = await prisma.lead.findFirst({ where: { ownerId, businessName: "Camping Vale Verde" } });
    expect(minimal!.sourceGroup).toBe("petropolisTeresopolisJun2026Lote2");
    expect(minimal!.primaryCNAEId).toBeNull();
  });

  it("normaliza TODO formato de telefone da planilha para E.164 (+55…)", async () => {
    const csv = readFileSync(join(process.cwd(), "test/fixtures/lead-import/phones-sample.csv"), "utf8");
    const rows = parseCsv(csv).map(toImportRow);

    const res = await request(app.getHttpServer())
      .post("/lead-import")
      .set("Authorization", `Bearer ${token}`)
      .send({ rows })
      .expect(201);
    expect(res.body.imported).toBe(7);

    // Every mobile variant of +5524982864581 must be stored exactly so.
    const MOBILE = "+5524982864581";
    for (const name of ["Tel Variante DDI", "Tel Sem Mais", "Tel Sem Pais", "Tel Formatado", "Tel Tronco Zero", "Tel Formatado DDI"]) {
      const lead = await prisma.lead.findFirst({ where: { ownerId, businessName: name } });
      expect(lead, name).toBeTruthy();
      expect(lead!.phone, name).toBe(MOBILE);
    }

    // whatsapp + contact phone on the formatted-DDI row also normalize.
    const withWa = await prisma.lead.findFirst({ where: { ownerId, businessName: "Tel Formatado DDI" } });
    expect(withWa!.whatsapp).toBe(MOBILE);
    const contact = await prisma.leadContact.findFirst({ where: { leadId: withWa!.id, name: "Contato Tel" } });
    expect(contact!.phone).toBe(MOBILE);

    // Landline keeps its 8-digit subscriber, still gets +55 + DDD.
    const landline = await prisma.lead.findFirst({ where: { ownerId, businessName: "Tel Fixo" } });
    expect(landline!.phone).toBe("+552422226134");
  });
});
