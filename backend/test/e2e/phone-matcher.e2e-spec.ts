import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/infra/database/prisma.service';
import { PhoneMatcherService } from '@/infra/shared/phone-matcher/phone-matcher.service';

/**
 * The GoTo softphone and the WhatsApp number are single, company-wide shared lines
 * (the GoTo sync runs under one fixed GOTO_DEFAULT_OWNER_ID). A call/message to a
 * lead must therefore link to that lead regardless of which internal user owns it —
 * e.g. a lead prospected by the "Bot Prospector" must still match when Bruno syncs.
 *
 * Regression: the matcher used to filter every query by `ownerId = <caller>`, so a
 * call from Bruno to a bot-owned lead produced an activity with leadId = NULL.
 */
describe('PhoneMatcherService — company-wide matching (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let matcher: PhoneMatcherService;

  const stamp = Date.now();
  const suffix = String(stamp).slice(-8);
  const leadPhone = `+55219${suffix}`; // owner-A lead
  const contactPhone = `+55219${String(stamp + 1).slice(-8)}`;
  const partnerPhone = `+55219${String(stamp + 2).slice(-8)}`;

  let leadOwnerId = '';
  let callerId = '';
  let leadId = '';
  let contactId = '';
  let partnerId = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    matcher = moduleFixture.get(PhoneMatcherService);

    // Two distinct users: the entity owner (e.g. Bot Prospector) and the caller (e.g. Bruno).
    const owner = await prisma.user.create({
      data: {
        name: 'PM Owner',
        email: `pm-owner-${stamp}@test.com`,
        password: 'x',
        role: 'admin',
      },
    });
    leadOwnerId = owner.id;
    const caller = await prisma.user.create({
      data: {
        name: 'PM Caller',
        email: `pm-caller-${stamp}@test.com`,
        password: 'x',
        role: 'admin',
      },
    });
    callerId = caller.id;

    leadId = (
      await prisma.lead.create({
        data: {
          businessName: 'PM Lead',
          ownerId: leadOwnerId,
          status: 'new',
          phone: leadPhone,
        },
      })
    ).id;
    contactId = (
      await prisma.contact.create({
        data: { name: 'PM Contact', ownerId: leadOwnerId, phone: contactPhone },
      })
    ).id;
    partnerId = (
      await prisma.partner.create({
        data: {
          name: 'PM Partner',
          ownerId: leadOwnerId,
          partnerType: 'outros',
          phone: partnerPhone,
        },
      })
    ).id;
  });

  afterAll(async () => {
    if (leadId) await prisma.lead.deleteMany({ where: { id: leadId } });
    if (contactId)
      await prisma.contact.deleteMany({ where: { id: contactId } });
    if (partnerId)
      await prisma.partner.deleteMany({ where: { id: partnerId } });
    if (leadOwnerId)
      await prisma.user.deleteMany({ where: { id: leadOwnerId } });
    if (callerId) await prisma.user.deleteMany({ where: { id: callerId } });
    await app?.close();
  });

  it('matches a LEAD owned by another user (caller != owner)', async () => {
    const result = await matcher.match(leadPhone, callerId);
    expect(result).toEqual({ entityType: 'lead', leadId });
  });

  it('matches a CONTACT owned by another user', async () => {
    const result = await matcher.match(contactPhone, callerId);
    expect(result).toEqual({ entityType: 'contact', contactId });
  });

  it('matches a PARTNER owned by another user', async () => {
    const result = await matcher.match(partnerPhone, callerId);
    expect(result).toEqual({ entityType: 'partner', partnerId });
  });

  it('still returns null when no entity has the number', async () => {
    const result = await matcher.match('+5521900000000', callerId);
    expect(result).toBeNull();
  });
});
