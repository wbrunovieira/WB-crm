/**
 * Script to migrate data from SQLite to PostgreSQL
 * Usage: node scripts/migrate-sqlite-to-postgres.js
 */

const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');

const sqlite = new Database('prisma/dev.db', { readonly: true });
const prisma = new PrismaClient();

function toDate(timestamp) {
  if (!timestamp) return null;
  return new Date(timestamp);
}

function toBool(val) {
  return val === 1;
}

async function migrateTable(tableName, selectAll, insertOne) {
  console.log(`Migrando ${tableName}...`);
  const rows = selectAll();
  let count = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      await insertOne(row);
      count++;
    } catch (err) {
      errors++;
      if (errors <= 2) {
        console.error(`  Erro: ${String(err.message).substring(0, 80)}`);
      }
    }
  }

  console.log(`  ${count}/${rows.length} OK${errors > 0 ? `, ${errors} erros` : ''}`);
}

async function main() {
  console.log('=== Migrando SQLite -> PostgreSQL ===\n');

  // Users
  await migrateTable('users',
    () => sqlite.prepare('SELECT * FROM users').all(),
    async (r) => {
      await prisma.user.create({
        data: {
          id: r.id, name: r.name, email: r.email,
          emailVerified: toDate(r.emailVerified),
          image: r.image, password: r.password, role: r.role,
          createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
        },
      });
    }
  );

  // Pipelines
  await migrateTable('pipelines',
    () => sqlite.prepare('SELECT * FROM pipelines').all(),
    async (r) => {
      await prisma.pipeline.create({
        data: {
          id: r.id, name: r.name, isDefault: toBool(r.isDefault),
          createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
        },
      });
    }
  );

  // Stages
  await migrateTable('stages',
    () => sqlite.prepare('SELECT * FROM stages').all(),
    async (r) => {
      await prisma.stage.create({
        data: {
          id: r.id, name: r.name, order: r.order, pipelineId: r.pipelineId,
          probability: r.probability,
          createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
        },
      });
    }
  );

  // Labels
  await migrateTable('labels',
    () => sqlite.prepare('SELECT * FROM labels').all(),
    async (r) => {
      await prisma.label.create({
        data: {
          id: r.id, name: r.name, color: r.color, ownerId: r.ownerId,
          createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
        },
      });
    }
  );

  // CNAEs
  await migrateTable('cnaes',
    () => sqlite.prepare('SELECT * FROM cnaes').all(),
    async (r) => {
      await prisma.cNAE.create({
        data: {
          id: r.id, code: r.code, description: r.description,
          createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
        },
      });
    }
  );

  // Tech Categories
  await migrateTable('tech_categories',
    () => sqlite.prepare('SELECT * FROM tech_categories').all(),
    async (r) => {
      await prisma.techCategory.create({
        data: {
          id: r.id, name: r.name, slug: r.slug, description: r.description,
          color: r.color, icon: r.icon, order: r.order,
          isActive: toBool(r.isActive),
          createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
        },
      });
    }
  );

  // Tech Languages
  await migrateTable('tech_languages',
    () => sqlite.prepare('SELECT * FROM tech_languages').all(),
    async (r) => {
      await prisma.techLanguage.create({
        data: {
          id: r.id, name: r.name, slug: r.slug, categorySlug: r.categorySlug,
          color: r.color, icon: r.icon, isActive: toBool(r.isActive),
          createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
        },
      });
    }
  );

  // Tech Frameworks
  await migrateTable('tech_frameworks',
    () => sqlite.prepare('SELECT * FROM tech_frameworks').all(),
    async (r) => {
      await prisma.techFramework.create({
        data: {
          id: r.id, name: r.name, slug: r.slug, languageSlug: r.languageSlug,
          color: r.color, icon: r.icon, isActive: toBool(r.isActive),
          createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
        },
      });
    }
  );

  // Business Lines
  await migrateTable('business_lines',
    () => sqlite.prepare('SELECT * FROM business_lines').all(),
    async (r) => {
      await prisma.businessLine.create({
        data: {
          id: r.id, name: r.name, slug: r.slug, description: r.description,
          color: r.color, icon: r.icon, isActive: toBool(r.isActive),
          order: r.order,
          createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
        },
      });
    }
  );

  // Products
  await migrateTable('products',
    () => sqlite.prepare('SELECT * FROM products').all(),
    async (r) => {
      await prisma.product.create({
        data: {
          id: r.id, name: r.name, slug: r.slug, description: r.description,
          businessLineId: r.businessLineId, basePrice: r.basePrice,
          currency: r.currency, pricingType: r.pricingType,
          isActive: toBool(r.isActive), order: r.order,
          createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
        },
      });
    }
  );

  // ICPs
  await migrateTable('icps',
    () => sqlite.prepare('SELECT * FROM icps').all(),
    async (r) => {
      await prisma.iCP.create({
        data: {
          id: r.id, name: r.name, slug: r.slug, content: r.content,
          status: r.status, ownerId: r.ownerId,
          createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
        },
      });
    }
  );

  // ICP Versions
  await migrateTable('icp_versions',
    () => sqlite.prepare('SELECT * FROM icp_versions').all(),
    async (r) => {
      await prisma.iCPVersion.create({
        data: {
          id: r.id, icpId: r.icpId, versionNumber: r.versionNumber,
          content: r.content, changeNote: r.changeNote, userId: r.userId,
          createdAt: toDate(r.createdAt),
        },
      });
    }
  );

  // Tech Profile Languages
  await migrateTable('tech_profile_languages',
    () => sqlite.prepare('SELECT * FROM tech_profile_languages').all(),
    async (r) => {
      await prisma.techProfileLanguage.create({
        data: {
          id: r.id, name: r.name, slug: r.slug, color: r.color, icon: r.icon,
          isActive: toBool(r.isActive), order: r.order,
          createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
        },
      });
    }
  );

  // Tech Profile Hosting
  await migrateTable('tech_profile_hosting',
    () => sqlite.prepare('SELECT * FROM tech_profile_hosting').all(),
    async (r) => {
      await prisma.techProfileHosting.create({
        data: {
          id: r.id, name: r.name, slug: r.slug, type: r.type,
          color: r.color, icon: r.icon, isActive: toBool(r.isActive),
          order: r.order,
          createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
        },
      });
    }
  );

  // Leads
  await migrateTable('leads',
    () => sqlite.prepare('SELECT * FROM leads').all(),
    async (r) => {
      await prisma.lead.create({
        data: {
          id: r.id, googleId: r.googleId, businessName: r.businessName,
          registeredName: r.registeredName, foundationDate: toDate(r.foundationDate),
          companyRegistrationID: r.companyRegistrationID,
          address: r.address, city: r.city, state: r.state, country: r.country,
          zipCode: r.zipCode, vicinity: r.vicinity,
          phone: r.phone, whatsapp: r.whatsapp, website: r.website, email: r.email,
          instagram: r.instagram, linkedin: r.linkedin, facebook: r.facebook,
          twitter: r.twitter, tiktok: r.tiktok,
          categories: r.categories, rating: r.rating, priceLevel: r.priceLevel,
          userRatingsTotal: r.userRatingsTotal,
          permanentlyClosed: toBool(r.permanentlyClosed), types: r.types,
          companyOwner: r.companyOwner, companySize: r.companySize,
          revenue: r.revenue, employeesCount: r.employeesCount,
          description: r.description, equityCapital: r.equityCapital,
          businessStatus: r.businessStatus,
          primaryActivity: r.primaryActivity, secondaryActivities: r.secondaryActivities,
          primaryCNAEId: r.primaryCNAEId, internationalActivity: r.internationalActivity,
          source: r.source, quality: r.quality, searchTerm: r.searchTerm,
          fieldsFilled: r.fieldsFilled, category: r.category, radius: r.radius,
          status: r.status, convertedAt: toDate(r.convertedAt),
          convertedToOrganizationId: r.convertedToOrganizationId,
          referredByPartnerId: r.referredByPartnerId,
          ownerId: r.ownerId,
          createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
        },
      });
    }
  );

  // Lead Contacts
  await migrateTable('lead_contacts',
    () => sqlite.prepare('SELECT * FROM lead_contacts').all(),
    async (r) => {
      await prisma.leadContact.create({
        data: {
          id: r.id, leadId: r.leadId, name: r.name, role: r.role,
          email: r.email, phone: r.phone, whatsapp: r.whatsapp,
          linkedin: r.linkedin, instagram: r.instagram,
          isPrimary: toBool(r.isPrimary),
          convertedToContactId: r.convertedToContactId,
          createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
        },
      });
    }
  );

  // Lead ICPs
  await migrateTable('lead_icps',
    () => sqlite.prepare('SELECT * FROM lead_icps').all(),
    async (r) => {
      await prisma.leadICP.create({
        data: {
          id: r.id, leadId: r.leadId, icpId: r.icpId,
          matchScore: r.matchScore, notes: r.notes,
          createdAt: toDate(r.createdAt),
        },
      });
    }
  );

  // Organizations
  await migrateTable('organizations',
    () => sqlite.prepare('SELECT * FROM organizations').all(),
    async (r) => {
      await prisma.organization.create({
        data: {
          id: r.id, name: r.name, legalName: r.legalName, industry: r.industry,
          website: r.website, phone: r.phone, email: r.email,
          address: r.address, city: r.city, state: r.state, country: r.country,
          description: r.description, instagram: r.instagram, linkedin: r.linkedin,
          facebook: r.facebook, primaryCNAEId: r.primaryCNAEId,
          internationalActivity: r.internationalActivity,
          externalProjectIds: r.externalProjectIds, sourceLeadId: r.sourceLeadId,
          ownerId: r.ownerId,
          createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
        },
      });
    }
  );

  // Organization ICPs
  await migrateTable('organization_icps',
    () => sqlite.prepare('SELECT * FROM organization_icps').all(),
    async (r) => {
      await prisma.organizationICP.create({
        data: {
          id: r.id, organizationId: r.organizationId, icpId: r.icpId,
          matchScore: r.matchScore, notes: r.notes,
          createdAt: toDate(r.createdAt),
        },
      });
    }
  );

  // Partners
  await migrateTable('partners',
    () => sqlite.prepare('SELECT * FROM partners').all(),
    async (r) => {
      await prisma.partner.create({
        data: {
          id: r.id, name: r.name, legalName: r.legalName, type: r.type,
          website: r.website, phone: r.phone, email: r.email,
          address: r.address, city: r.city, state: r.state, country: r.country,
          description: r.description, status: r.status,
          lastContactDate: toDate(r.lastContactDate),
          ownerId: r.ownerId,
          createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
        },
      });
    }
  );

  // Contacts
  await migrateTable('contacts',
    () => sqlite.prepare('SELECT * FROM contacts').all(),
    async (r) => {
      await prisma.contact.create({
        data: {
          id: r.id, name: r.name, email: r.email, phone: r.phone,
          whatsapp: r.whatsapp, role: r.role, instagram: r.instagram,
          linkedin: r.linkedin, organizationId: r.organizationId,
          leadId: r.leadId, partnerId: r.partnerId,
          sourceLeadContactId: r.sourceLeadContactId, ownerId: r.ownerId,
          createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
        },
      });
    }
  );

  // Deals
  await migrateTable('deals',
    () => sqlite.prepare('SELECT * FROM deals').all(),
    async (r) => {
      await prisma.deal.create({
        data: {
          id: r.id, title: r.title, value: r.value, currency: r.currency,
          expectedCloseDate: toDate(r.expectedCloseDate),
          probability: r.probability, status: r.status,
          stageId: r.stageId, contactId: r.contactId,
          organizationId: r.organizationId, ownerId: r.ownerId,
          createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
        },
      });
    }
  );

  // Activities
  await migrateTable('activities',
    () => sqlite.prepare('SELECT * FROM activities').all(),
    async (r) => {
      await prisma.activity.create({
        data: {
          id: r.id, type: r.type, subject: r.subject, description: r.description,
          dueDate: toDate(r.dueDate), completed: toBool(r.completed),
          completedAt: toDate(r.completedAt),
          dealId: r.dealId, contactId: r.contactId, contactIds: r.contactIds,
          leadId: r.leadId, partnerId: r.partnerId, ownerId: r.ownerId,
          createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
        },
      });
    }
  );

  // Cadences
  await migrateTable('cadences',
    () => sqlite.prepare('SELECT * FROM cadences').all(),
    async (r) => {
      await prisma.cadence.create({
        data: {
          id: r.id, name: r.name, slug: r.slug, description: r.description,
          objective: r.objective, durationDays: r.durationDays,
          icpId: r.icpId, status: r.status, ownerId: r.ownerId,
          createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
        },
      });
    }
  );

  // Cadence Steps
  await migrateTable('cadence_steps',
    () => sqlite.prepare('SELECT * FROM cadence_steps').all(),
    async (r) => {
      await prisma.cadenceStep.create({
        data: {
          id: r.id, cadenceId: r.cadenceId, dayNumber: r.dayNumber,
          channel: r.channel, subject: r.subject, description: r.description,
          order: r.order,
          createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
        },
      });
    }
  );

  // Lead Cadences
  await migrateTable('lead_cadences',
    () => sqlite.prepare('SELECT * FROM lead_cadences').all(),
    async (r) => {
      await prisma.leadCadence.create({
        data: {
          id: r.id, leadId: r.leadId, cadenceId: r.cadenceId, status: r.status,
          startDate: toDate(r.startDate), pausedAt: toDate(r.pausedAt),
          completedAt: toDate(r.completedAt), cancelledAt: toDate(r.cancelledAt),
          currentStep: r.currentStep, notes: r.notes, ownerId: r.ownerId,
          createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
        },
      });
    }
  );

  // Lead Cadence Activities
  await migrateTable('lead_cadence_activities',
    () => sqlite.prepare('SELECT * FROM lead_cadence_activities').all(),
    async (r) => {
      await prisma.leadCadenceActivity.create({
        data: {
          id: r.id, leadCadenceId: r.leadCadenceId, cadenceStepId: r.cadenceStepId,
          activityId: r.activityId, scheduledDate: toDate(r.scheduledDate),
          createdAt: toDate(r.createdAt),
        },
      });
    }
  );

  console.log('\n=== Migracao concluida! ===');

  const counts = await Promise.all([
    prisma.user.count(),
    prisma.lead.count(),
    prisma.organization.count(),
    prisma.contact.count(),
    prisma.deal.count(),
    prisma.activity.count(),
    prisma.iCP.count(),
  ]);

  console.log('\nContagens:');
  console.log('  Users: ' + counts[0]);
  console.log('  Leads: ' + counts[1]);
  console.log('  Organizations: ' + counts[2]);
  console.log('  Contacts: ' + counts[3]);
  console.log('  Deals: ' + counts[4]);
  console.log('  Activities: ' + counts[5]);
  console.log('  ICPs: ' + counts[6]);

  await prisma.$disconnect();
  sqlite.close();
}

main().catch(console.error);
