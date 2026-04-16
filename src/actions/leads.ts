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
import { normalizeCNPJ } from "@/lib/validations/cnpj";

// ============ LEAD DUPLICATE DETECTION ============

export interface LeadSummary {
  id: string;
  businessName: string;
  companyRegistrationID: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  isArchived: boolean;
  status: string;
}

export interface LeadDuplicates {
  cnpj: LeadSummary[];
  name: LeadSummary[];
  phone: LeadSummary[];
  email: LeadSummary[];
  address: LeadSummary[];
}

const LEAD_SUMMARY_SELECT = {
  id: true,
  businessName: true,
  companyRegistrationID: true,
  phone: true,
  email: true,
  address: true,
  city: true,
  state: true,
  isArchived: true,
  status: true,
} as const;

/**
 * Verifica possíveis leads duplicados com base nos campos fornecidos.
 * Inclui leads ativos e arquivados. Não filtra por owner (duplicidade é global).
 * excludeId: ignora o próprio lead (útil na edição).
 */
export async function checkLeadDuplicates(input: {
  companyRegistrationID?: string | null;
  businessName?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  excludeId?: string;
}): Promise<LeadDuplicates> {
  await getAuthenticatedSession();

  const exclude = input.excludeId ? { id: { not: input.excludeId } } : {};

  // 1. CNPJ exato (normalizado)
  const cnpjNorm = input.companyRegistrationID
    ? normalizeCNPJ(input.companyRegistrationID)
    : null;

  const [cnpj, name, phone, email, address] = await Promise.all([
    // --- CNPJ exato ---
    cnpjNorm
      ? prisma.lead.findMany({
          where: { ...exclude, companyRegistrationID: cnpjNorm },
          select: LEAD_SUMMARY_SELECT,
        })
      : Promise.resolve([]),

    // --- Nome similar (contains, case-insensitive) ---
    input.businessName && input.businessName.trim().length >= 3
      ? prisma.lead.findMany({
          where: {
            ...exclude,
            businessName: { contains: input.businessName.trim(), mode: "insensitive" },
          },
          select: LEAD_SUMMARY_SELECT,
          take: 10,
        })
      : Promise.resolve([]),

    // --- Telefone/WhatsApp (dígitos normalizados) ---
    (() => {
      const rawPhone = input.phone || input.whatsapp;
      const digits = rawPhone ? rawPhone.replace(/\D/g, "") : null;
      if (!digits || digits.length < 8) return Promise.resolve([]);
      return prisma.lead.findMany({
        where: {
          ...exclude,
          OR: [
            { phone: { contains: digits, mode: "insensitive" } },
            { whatsapp: { contains: digits, mode: "insensitive" } },
          ],
        },
        select: LEAD_SUMMARY_SELECT,
        take: 10,
      });
    })(),

    // --- Email exato (case-insensitive) ---
    input.email && input.email.trim().length > 3
      ? prisma.lead.findMany({
          where: {
            ...exclude,
            email: { equals: input.email.trim(), mode: "insensitive" },
          },
          select: LEAD_SUMMARY_SELECT,
          take: 10,
        })
      : Promise.resolve([]),

    // --- Logradouro (parte do endereço antes da vírgula) + cidade ---
    (() => {
      if (!input.address || input.address.trim().length < 5) return Promise.resolve([]);
      const street = input.address.split(",")[0].trim();
      if (street.length < 5) return Promise.resolve([]);
      return prisma.lead.findMany({
        where: {
          ...exclude,
          address: { contains: street, mode: "insensitive" },
          ...(input.city ? { city: { equals: input.city.trim(), mode: "insensitive" } } : {}),
        },
        select: LEAD_SUMMARY_SELECT,
        take: 10,
      });
    })(),
  ]);

  return { cnpj, name, phone, email, address };
}

// ============ LEAD CREATE — RESULTADO DISCRIMINADO ============
//
// Todas as rotas de criação de leads (manual, IA, Google, APIs externas) devem
// usar createLead() ou createLeadWithContacts() e tratar o resultado conforme
// o `status` retornado.
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ status: 'created'                                                       │
// │   → Lead criado com sucesso. Usar `lead` e `contacts` normalmente.      │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ status: 'duplicate_found'                                               │
// │   → Possíveis duplicatas encontradas. O campo `duplicates` contém:      │
// │     - cnpj:    leads com MESMO CNPJ (match exato — alta confiança)      │
// │     - name:    leads com nome similar (contains, case-insensitive)      │
// │     - phone:   leads com mesmo telefone ou WhatsApp (dígitos iguais)    │
// │     - email:   leads com mesmo e-mail (case-insensitive)                │
// │     - address: leads na mesma rua + cidade                              │
// │                                                                         │
// │   O CALLER decide como tratar. Exemplos por integração:                 │
// │     Form manual      → mostra painel de revisão, usuário descarta e     │
// │                         re-envia com skipDuplicateCheck: true            │
// │     Agente IA        → pergunta ao usuário no chat antes de prosseguir  │
// │     Importação Google→ lista conflitos para revisão antes do bulk       │
// │     API REST futura  → retorna HTTP 409 com body { duplicates }         │
// │     Script de import → loga e pula, ou força com skipDuplicateCheck     │
// │                                                                         │
// │   Para forçar criação após confirmação:                                 │
// │     createLead(data, { skipDuplicateCheck: true })                      │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ CNPJ inválido/duplicado                                                 │
// │   → Zod lança erro de validação (formato).                              │
// │   → DB lança erro de constraint única (CNPJ já existe, mesmo com skip). │
// └─────────────────────────────────────────────────────────────────────────┘

export type CreateLeadResult =
  | { status: "created"; lead: Awaited<ReturnType<typeof prisma.lead.create>>; contacts: Awaited<ReturnType<typeof prisma.leadContact.create>>[] }
  | { status: "duplicate_found"; duplicates: LeadDuplicates };

/** Retorna true se ao menos uma categoria tem duplicatas */
function hasDuplicates(d: LeadDuplicates): boolean {
  return d.cnpj.length > 0 || d.name.length > 0 || d.phone.length > 0 ||
    d.email.length > 0 || d.address.length > 0;
}

// ============ LEAD CRUD ============

const LEADS_PAGE_SIZE = 50;

export async function getLeads(filters?: {
  search?: string;
  contactSearch?: string;
  status?: string;
  quality?: string;
  owner?: string;
  icpId?: string;
  hasCadence?: string;
  archived?: string;
  page?: string;
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

  const page = Math.max(1, parseInt(filters?.page ?? "1") || 1);
  const skip = (page - 1) * LEADS_PAGE_SIZE;

  const whereClause = {
    ...ownerFilter,
    ...archiveFilter,
    isProspect: false,
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
  };

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where: whereClause,
      include: {
        leadContacts: true,
        owner: {
          select: { id: true, name: true },
        },
        icps: {
          include: {
            icp: { select: { id: true, name: true } },
          },
          take: 1,
        },
        _count: {
          select: { leadContacts: true, leadCadences: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: LEADS_PAGE_SIZE,
      skip,
    }),
    prisma.lead.count({ where: whereClause }),
  ]);

  return { leads, total, page, pageSize: LEADS_PAGE_SIZE };
}

export async function getProspects(filters?: {
  search?: string;
  owner?: string;
}) {
  const ownerFilter = await getOwnerOrSharedFilter("lead", filters?.owner);

  const searchConditions: Record<string, unknown>[] = [];
  if (filters?.search) {
    searchConditions.push({
      OR: [
        { businessName: { contains: filters.search, mode: "insensitive" as const } },
        { city: { contains: filters.search, mode: "insensitive" as const } },
        { description: { contains: filters.search, mode: "insensitive" as const } },
        { categories: { contains: filters.search, mode: "insensitive" as const } },
      ],
    });
  }

  return prisma.lead.findMany({
    where: {
      ...ownerFilter,
      isProspect: true,
      isArchived: false,
      ...(searchConditions.length > 0 ? searchConditions[0] : {}),
    },
    select: {
      id: true,
      businessName: true,
      city: true,
      state: true,
      country: true,
      phone: true,
      website: true,
      rating: true,
      userRatingsTotal: true,
      categories: true,
      businessStatus: true,
      description: true,
      googleMapsUrl: true,
      source: true,
      searchTerm: true,
      createdAt: true,
      owner: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function qualifyProspect(id: string) {
  const session = await getAuthenticatedSession();
  const ownerFilter = await getOwnerOrSharedFilter("lead");

  const prospect = await prisma.lead.findFirst({
    where: { id, isProspect: true, ...ownerFilter },
    select: { id: true, ownerId: true },
  });

  if (!prospect) throw new Error("Prospecto não encontrado");

  const lead = await prisma.lead.update({
    where: { id },
    data: { isProspect: false, status: "new" },
  });

  void session;
  revalidatePath("/leads");
  revalidatePath("/leads/prospects");
  return lead;
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
        include: {
          whatsappMessages: {
            where: { mediaDriveId: { not: null } },
            select: {
              id: true,
              fromMe: true,
              pushName: true,
              timestamp: true,
              messageType: true,
              mediaDriveId: true,
              mediaMimeType: true,
              mediaLabel: true,
              mediaTranscriptText: true,
            },
            orderBy: { timestamp: "asc" },
          },
        },
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

export async function createLead(
  data: LeadFormData,
  options?: { skipDuplicateCheck?: boolean }
): Promise<CreateLeadResult> {
  const session = await getAuthenticatedSession();
  const validated = leadSchema.parse(data);

  // Verificação de duplicidade — ver bloco de documentação acima
  if (!options?.skipDuplicateCheck) {
    const duplicates = await checkLeadDuplicates({
      companyRegistrationID: validated.companyRegistrationID,
      businessName: validated.businessName,
      phone: validated.phone,
      whatsapp: validated.whatsapp,
      email: validated.email,
      address: validated.address,
      city: validated.city,
    });
    if (hasDuplicates(duplicates)) {
      return { status: "duplicate_found", duplicates };
    }
  }

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
  return { status: "created", lead, contacts: [] };
}

export async function createLeadWithContacts(
  leadData: LeadFormData,
  contacts: LeadContactFormData[],
  options?: { skipDuplicateCheck?: boolean }
): Promise<CreateLeadResult> {
  const session = await getAuthenticatedSession();

  // Valida os dados do lead (inclui validação de CNPJ via Zod)
  const validatedLead = leadSchema.parse(leadData);

  // Valida todos os contatos
  const validatedContacts = contacts.map((contact) =>
    leadContactSchema.parse(contact)
  );

  // Verificação de duplicidade — ver bloco de documentação acima.
  // Executada antes da transação para evitar rollback desnecessário.
  if (!options?.skipDuplicateCheck) {
    const duplicates = await checkLeadDuplicates({
      companyRegistrationID: validatedLead.companyRegistrationID,
      businessName: validatedLead.businessName,
      phone: validatedLead.phone,
      whatsapp: validatedLead.whatsapp,
      email: validatedLead.email,
      address: validatedLead.address,
      city: validatedLead.city,
    });
    if (hasDuplicates(duplicates)) {
      return { status: "duplicate_found", duplicates };
    }
  }

  // Criação atômica: lead + contatos numa transação
  const result = await prisma.$transaction(async (tx) => {
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

    const createdContacts: Awaited<ReturnType<typeof tx.leadContact.create>>[] = [];

    if (validatedContacts.length > 0) {
      // Se nenhum contato tem isPrimary, o primeiro assume
      const hasPrimaryContact = validatedContacts.some((c) => c.isPrimary);
      let primaryAssigned = false;

      for (let i = 0; i < validatedContacts.length; i++) {
        const contactData = validatedContacts[i];

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

    return { lead, contacts: createdContacts };
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${result.lead.id}`);

  return { status: "created", lead: result.lead, contacts: result.contacts };
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

export async function archiveLead(id: string, reason?: string) {
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
    data: {
      isArchived: true,
      archivedAt: new Date(),
      archivedReason: reason ?? null,
    },
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
    data: { isArchived: false, archivedAt: null, archivedReason: null },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return updated;
}

export async function bulkArchiveLeads(
  ids: string[],
  reason?: string
): Promise<{ archived: number; skipped: number }> {
  await getAuthenticatedSession();

  if (ids.length === 0) {
    throw new Error("Nenhum lead selecionado");
  }

  const ownerFilter = await getOwnerOrSharedFilter("lead");

  // Find only eligible leads: in the requested ids, not archived, not converted
  const eligibleLeads = await prisma.lead.findMany({
    where: {
      id: { in: ids },
      ...ownerFilter,
      isArchived: false,
      convertedAt: null,
    },
    select: { id: true },
  });

  const eligibleIds = eligibleLeads.map((l) => l.id);
  const skipped = ids.length - eligibleIds.length;

  if (eligibleIds.length === 0) {
    return { archived: 0, skipped };
  }

  await prisma.lead.updateMany({
    where: { id: { in: eligibleIds } },
    data: {
      isArchived: true,
      archivedAt: new Date(),
      archivedReason: reason ?? null,
    },
  });

  revalidatePath("/leads");
  return { archived: eligibleIds.length, skipped };
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
