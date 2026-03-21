"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  leadSchema,
  leadContactSchema,
  LeadFormData,
  LeadContactFormData,
} from "@/lib/validations/lead";
import {
  getAuthenticatedSession,
  getOwnerOrSharedFilter,
  canAccessEntity,
} from "@/lib/permissions";
import { languagesToJson } from "@/lib/validations/languages";

// ============ LEAD CRUD ============

export async function getLeads(filters?: {
  search?: string;
  contactSearch?: string;
  status?: string;
  quality?: string;
  owner?: string;
  icpId?: string;
  hasCadence?: string;
  archived?: string;
}) {
  const ownerFilter = await getOwnerOrSharedFilter("lead", filters?.owner);

  // Archive filter: default excludes archived, 'yes' = only archived, 'all' = no filter
  const archiveFilter =
    filters?.archived === "all"
      ? {}
      : filters?.archived === "yes"
        ? { isArchived: true }
        : { isArchived: false };

  // Build search conditions that need AND combination
  const searchConditions: Record<string, unknown>[] = [];
  if (filters?.search) {
    searchConditions.push({
      OR: [
        { businessName: { contains: filters.search, mode: "insensitive" as const } },
        { registeredName: { contains: filters.search, mode: "insensitive" as const } },
        { email: { contains: filters.search, mode: "insensitive" as const } },
        { city: { contains: filters.search, mode: "insensitive" as const } },
        { description: { contains: filters.search, mode: "insensitive" as const } },
      ],
    });
  }
  if (filters?.contactSearch) {
    // Use raw SQL with unaccent for accent-insensitive search on contact name/email
    const contactMatchIds = await prisma.$queryRaw<{ leadId: string }[]>`
      SELECT DISTINCT "leadId" FROM lead_contacts
      WHERE unaccent(name) ILIKE '%' || unaccent(${filters.contactSearch}) || '%'
         OR unaccent(COALESCE(email, '')) ILIKE '%' || unaccent(${filters.contactSearch}) || '%'
    `;
    const matchingLeadIds = contactMatchIds.map((r) => r.leadId);
    searchConditions.push({
      OR: [
        { id: { in: matchingLeadIds } },
        { email: { contains: filters.contactSearch, mode: "insensitive" as const } },
      ],
    });
  }

  const leads = await prisma.lead.findMany({
    where: {
      ...ownerFilter,
      ...archiveFilter,
      ...(searchConditions.length === 1 ? searchConditions[0] : {}),
      ...(searchConditions.length > 1 ? { AND: searchConditions } : {}),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.quality && { quality: filters.quality }),
      ...(filters?.icpId && {
        icps: {
          some: { icpId: filters.icpId },
        },
      }),
      ...(filters?.hasCadence === "no" && {
        leadCadences: { none: {} },
      }),
      ...(filters?.hasCadence === "yes" && {
        leadCadences: { some: {} },
      }),
    },
    include: {
      leadContacts: true,
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
      icps: {
        include: {
          icp: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        take: 1,
      },
      _count: {
        select: {
          leadContacts: true,
          leadCadences: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return leads;
}

export async function getLeadById(id: string) {
  const ownerFilter = await getOwnerOrSharedFilter("lead");

  const lead = await prisma.lead.findFirst({
    where: {
      id,
      ...ownerFilter,
    },
    include: {
      primaryCNAE: true,
      labels: true,
      leadContacts: {
        orderBy: [
          { isPrimary: "desc" },
          { name: "asc" },
        ],
      },
      activities: {
        orderBy: [
          { failedAt: { sort: "asc", nulls: "first" } },
          { skippedAt: { sort: "asc", nulls: "first" } },
          { completed: "asc" },
          { dueDate: { sort: "asc", nulls: "last" } },
          { createdAt: "desc" },
        ],
      },
      convertedOrganization: {
        include: {
          contacts: true,
          deals: true,
        },
      },
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return lead;
}

export async function createLead(data: LeadFormData) {
  const session = await getAuthenticatedSession();
  const validated = leadSchema.parse(data);

  const { languages, labelIds, ...rest } = validated;
  const lead = await prisma.lead.create({
    data: {
      ...rest,
      languages: languagesToJson(languages),
      ownerId: session.user.id,
      ...(labelIds && labelIds.length > 0 && {
        labels: { connect: labelIds.map((id) => ({ id })) },
      }),
    },
  });

  revalidatePath("/leads");
  return lead;
}

export async function createLeadWithContacts(
  leadData: LeadFormData,
  contacts: LeadContactFormData[]
) {
  const session = await getAuthenticatedSession();

  // Validate lead data
  const validatedLead = leadSchema.parse(leadData);

  // Validate all contacts
  const validatedContacts = contacts.map((contact) =>
    leadContactSchema.parse(contact)
  );

  // Use transaction to ensure all-or-nothing
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create the lead
    const { languages: leadLanguages, labelIds, ...leadRest } = validatedLead;
    const lead = await tx.lead.create({
      data: {
        ...leadRest,
        languages: languagesToJson(leadLanguages),
        ownerId: session.user.id,
        ...(labelIds && labelIds.length > 0 && {
          labels: { connect: labelIds.map((id) => ({ id })) },
        }),
      },
    });

    // 2. Create contacts if any
    const createdContacts = [];

    if (validatedContacts.length > 0) {
      // Determine primary contact logic:
      // - If any contact has isPrimary: true, use the first one as primary
      // - If no contact has isPrimary, set the first contact as primary
      const hasPrimaryContact = validatedContacts.some((c) => c.isPrimary);
      let primaryAssigned = false;

      for (let i = 0; i < validatedContacts.length; i++) {
        const contactData = validatedContacts[i];

        // Determine if this contact should be primary
        let isPrimary = false;
        if (!primaryAssigned) {
          if (hasPrimaryContact && contactData.isPrimary) {
            isPrimary = true;
            primaryAssigned = true;
          } else if (!hasPrimaryContact && i === 0) {
            isPrimary = true;
            primaryAssigned = true;
          }
        }

        const { languages: contactLangs, ...contactRest } = contactData;
        const contact = await tx.leadContact.create({
          data: {
            ...contactRest,
            languages: languagesToJson(contactLangs),
            isPrimary,
            leadId: lead.id,
          },
        });

        createdContacts.push(contact);
      }
    }

    return {
      lead,
      contacts: createdContacts,
    };
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${result.lead.id}`);

  return result;
}

export async function updateLead(id: string, data: LeadFormData) {
  await getAuthenticatedSession();
  const validated = leadSchema.parse(data);

  // Check ownership or shared access
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing || !(await canAccessEntity("lead", id, existing.ownerId))) {
    throw new Error("Lead não encontrado");
  }

  const { languages, labelIds, ...rest } = validated;
  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...rest,
      languages: languagesToJson(languages),
      ...(labelIds && {
        labels: { set: labelIds.map((id) => ({ id })) },
      }),
    },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return lead;
}

export async function deleteLead(id: string) {
  await getAuthenticatedSession();

  // Check ownership and if lead is already converted
  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { ownerId: true, convertedAt: true },
  });

  if (!lead || !(await canAccessEntity("lead", id, lead.ownerId))) {
    throw new Error("Lead não encontrado");
  }

  if (lead.convertedAt) {
    throw new Error("Não é possível excluir um lead já convertido");
  }

  await prisma.lead.delete({ where: { id } });

  revalidatePath("/leads");
}

// ============ LEAD ARCHIVE ============

export async function archiveLead(id: string) {
  await getAuthenticatedSession();

  const ownerFilter = await getOwnerOrSharedFilter("lead");

  const lead = await prisma.lead.findFirst({
    where: { id, ...ownerFilter },
  });

  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  if (lead.convertedAt) {
    throw new Error("Lead já foi convertido");
  }

  if (lead.isArchived) {
    throw new Error("Lead já está arquivado");
  }

  const updated = await prisma.lead.update({
    where: { id },
    data: { isArchived: true },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return updated;
}

export async function unarchiveLead(id: string) {
  await getAuthenticatedSession();

  const ownerFilter = await getOwnerOrSharedFilter("lead");

  const lead = await prisma.lead.findFirst({
    where: { id, ...ownerFilter },
  });

  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  if (!lead.isArchived) {
    throw new Error("Lead não está arquivado");
  }

  const updated = await prisma.lead.update({
    where: { id },
    data: { isArchived: false },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return updated;
}

// ============ LEAD CONTACT CRUD ============

export async function getLeadContacts(leadId: string) {
  const ownerFilter = await getOwnerOrSharedFilter("lead");

  const contacts = await prisma.leadContact.findMany({
    where: {
      leadId,
      lead: ownerFilter,
    },
    orderBy: [
      { isPrimary: "desc" },
      { name: "asc" },
    ],
  });

  return contacts;
}

export async function createLeadContact(leadId: string, data: LeadContactFormData) {
  await getAuthenticatedSession();

  // Verify lead ownership
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });

  if (!lead || !(await canAccessEntity("lead", leadId, lead.ownerId))) {
    throw new Error("Lead não encontrado");
  }

  const validated = leadContactSchema.parse(data);

  // If setting as primary, remove primary from others
  if (validated.isPrimary) {
    await prisma.leadContact.updateMany({
      where: { leadId },
      data: { isPrimary: false },
    });
  }

  const { languages, ...rest } = validated;
  const contact = await prisma.leadContact.create({
    data: {
      ...rest,
      languages: languagesToJson(languages),
      leadId,
    },
  });

  revalidatePath(`/leads/${leadId}`);
  return contact;
}

export async function updateLeadContact(
  id: string,
  data: LeadContactFormData
) {
  await getAuthenticatedSession();
  const validated = leadContactSchema.parse(data);

  const leadContact = await prisma.leadContact.findUnique({
    where: { id },
    include: { lead: true },
  });

  if (!leadContact || !(await canAccessEntity("lead", leadContact.leadId, leadContact.lead.ownerId))) {
    throw new Error("Contato não encontrado");
  }

  // If setting as primary, remove primary from others
  if (validated.isPrimary && !leadContact.isPrimary) {
    await prisma.leadContact.updateMany({
      where: { leadId: leadContact.leadId, id: { not: id } },
      data: { isPrimary: false },
    });
  }

  const { languages, ...rest } = validated;
  const updated = await prisma.leadContact.update({
    where: { id },
    data: {
      ...rest,
      languages: languagesToJson(languages),
    },
  });

  revalidatePath(`/leads/${leadContact.leadId}`);
  return updated;
}

export async function deleteLeadContact(id: string) {
  await getAuthenticatedSession();

  const leadContact = await prisma.leadContact.findUnique({
    where: { id },
    include: { lead: true },
  });

  if (!leadContact || !(await canAccessEntity("lead", leadContact.leadId, leadContact.lead.ownerId))) {
    throw new Error("Contato não encontrado");
  }

  // Check if already converted
  if (leadContact.convertedToContactId) {
    throw new Error("Não é possível excluir um contato já convertido");
  }

  await prisma.leadContact.delete({
    where: { id },
  });

  revalidatePath(`/leads/${leadContact.leadId}`);
}

export async function toggleLeadContactActive(id: string) {
  await getAuthenticatedSession();

  const leadContact = await prisma.leadContact.findUnique({
    where: { id },
    include: { lead: true },
  });

  if (!leadContact || !(await canAccessEntity("lead", leadContact.leadId, leadContact.lead.ownerId))) {
    throw new Error("Contato não encontrado");
  }

  const updated = await prisma.leadContact.update({
    where: { id },
    data: { isActive: !leadContact.isActive },
  });

  revalidatePath(`/leads/${leadContact.leadId}`);
  return updated;
}

// ============ LEAD CONVERSION ============

export async function convertLeadToOrganization(leadId: string) {
  const session = await getAuthenticatedSession();

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      leadContacts: true,
      contacts: true,
      activities: true,
    },
  });

  if (!lead || !(await canAccessEntity("lead", leadId, lead.ownerId))) {
    throw new Error("Lead não encontrado");
  }

  if (lead.convertedAt) {
    throw new Error("Lead já foi convertido");
  }

  if (lead.leadContacts.length === 0) {
    throw new Error("Lead precisa ter pelo menos um contato antes de ser convertido");
  }

  // Transaction: Create Organization + Contacts
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Organization from Lead
    const organization = await tx.organization.create({
      data: {
        name: lead.businessName,
        legalName: lead.registeredName,
        foundationDate: lead.foundationDate,
        website: lead.website,
        phone: lead.phone,
        whatsapp: lead.whatsapp,
        email: lead.email,
        country: lead.country,
        state: lead.state,
        city: lead.city,
        zipCode: lead.zipCode,
        streetAddress: lead.address,
        industry: lead.primaryActivity,
        employeeCount: lead.employeesCount,
        annualRevenue: lead.revenue,
        taxId: lead.companyRegistrationID,
        description: lead.description,
        companyOwner: lead.companyOwner,
        companySize: lead.companySize,
        primaryCNAEId: lead.primaryCNAEId,
        internationalActivity: lead.internationalActivity,
        instagram: lead.instagram,
        linkedin: lead.linkedin,
        facebook: lead.facebook,
        twitter: lead.twitter,
        tiktok: lead.tiktok,
        sourceLeadId: lead.id,
        ownerId: session.user.id,
      },
    });

    // 2. Create Contacts from LeadContacts
    const contactsFromLeadContacts = await Promise.all(
      lead.leadContacts.map(async (leadContact) => {
        const contact = await tx.contact.create({
          data: {
            name: leadContact.name,
            email: leadContact.email,
            phone: leadContact.phone,
            whatsapp: leadContact.whatsapp,
            role: leadContact.role,
            organizationId: organization.id,
            isPrimary: leadContact.isPrimary,
            sourceLeadContactId: leadContact.id,
            ownerId: session.user.id,
          },
        });

        // Update LeadContact with conversion info
        await tx.leadContact.update({
          where: { id: leadContact.id },
          data: { convertedToContactId: contact.id },
        });

        return contact;
      })
    );

    // 3. Update existing Contacts linked to the Lead
    // Change their link from Lead to Organization
    await tx.contact.updateMany({
      where: { leadId: lead.id },
      data: {
        leadId: null,
        organizationId: organization.id,
      },
    });

    // 4. Migrate Tech Profile data from Lead to Organization
    // Get all tech profile data from the lead
    const [leadLanguages, leadFrameworks, leadHosting, leadDatabases, leadERPs, leadCRMs, leadEcommerces, leadSecondaryCNAEs] = await Promise.all([
      tx.leadLanguage.findMany({ where: { leadId: lead.id } }),
      tx.leadFramework.findMany({ where: { leadId: lead.id } }),
      tx.leadHosting.findMany({ where: { leadId: lead.id } }),
      tx.leadDatabase.findMany({ where: { leadId: lead.id } }),
      tx.leadERP.findMany({ where: { leadId: lead.id } }),
      tx.leadCRM.findMany({ where: { leadId: lead.id } }),
      tx.leadEcommerce.findMany({ where: { leadId: lead.id } }),
      tx.leadSecondaryCNAE.findMany({ where: { leadId: lead.id } }),
    ]);

    // Create corresponding organization tech profile entries and secondary CNAEs
    await Promise.all([
      ...leadLanguages.map(l => tx.organizationLanguage.create({
        data: { organizationId: organization.id, languageId: l.languageId }
      })),
      ...leadFrameworks.map(f => tx.organizationFramework.create({
        data: { organizationId: organization.id, frameworkId: f.frameworkId }
      })),
      ...leadHosting.map(h => tx.organizationHosting.create({
        data: { organizationId: organization.id, hostingId: h.hostingId }
      })),
      ...leadDatabases.map(d => tx.organizationDatabase.create({
        data: { organizationId: organization.id, databaseId: d.databaseId }
      })),
      ...leadERPs.map(e => tx.organizationERP.create({
        data: { organizationId: organization.id, erpId: e.erpId }
      })),
      ...leadCRMs.map(c => tx.organizationCRM.create({
        data: { organizationId: organization.id, crmId: c.crmId }
      })),
      ...leadEcommerces.map(e => tx.organizationEcommerce.create({
        data: { organizationId: organization.id, ecommerceId: e.ecommerceId }
      })),
      ...leadSecondaryCNAEs.map(cnae => tx.organizationSecondaryCNAE.create({
        data: { organizationId: organization.id, cnaeId: cnae.cnaeId }
      })),
    ]);

    // 5. Update Lead as converted
    await tx.lead.update({
      where: { id: leadId },
      data: {
        status: "qualified",
        convertedAt: new Date(),
        convertedToOrganizationId: organization.id,
      },
    });

    // Get all contacts now linked to the organization (both new and migrated)
    const allContacts = await tx.contact.findMany({
      where: { organizationId: organization.id },
    });

    // Note: Activities linked to the lead remain unchanged
    // They serve as historical record of the prospecting process
    // and can be viewed through the lead detail page

    return {
      organization,
      contacts: allContacts,
      contactsFromLeadContacts: contactsFromLeadContacts,
      activities: lead.activities,
    };
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/organizations");
  revalidatePath(`/organizations/${result.organization.id}`);

  return result;
}

// ============ LEAD ACTIVITY ORDER ============

export async function updateLeadActivityOrder(
  leadId: string,
  activityIds: string[]
) {
  await getAuthenticatedSession();

  if (activityIds.length === 0) {
    throw new Error("Lista de atividades não pode ser vazia");
  }

  const ownerFilter = await getOwnerOrSharedFilter("lead");
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, ...ownerFilter },
  });

  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: { activityOrder: JSON.stringify(activityIds) },
  });

  revalidatePath(`/leads/${leadId}`);
  return updated;
}

export async function resetLeadActivityOrder(leadId: string) {
  await getAuthenticatedSession();

  const ownerFilter = await getOwnerOrSharedFilter("lead");
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, ...ownerFilter },
  });

  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: { activityOrder: null },
  });

  revalidatePath(`/leads/${leadId}`);
  return updated;
}
