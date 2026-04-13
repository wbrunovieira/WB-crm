import { prisma } from "@/lib/prisma";
import { getOrCreateFolder } from "./drive";

const ROOT_FOLDER_NAME = "WB-CRM";
const PROPOSALS_FOLDER_NAME = "Propostas";
const WHATSAPP_FOLDER_NAME = "WhatsApp";

let rootFolderId: string | null = null;

async function getRootFolder(): Promise<string> {
  if (rootFolderId) return rootFolderId;
  rootFolderId = await getOrCreateFolder(ROOT_FOLDER_NAME);
  return rootFolderId;
}

async function getProposalsFolder(): Promise<string> {
  const root = await getRootFolder();
  return getOrCreateFolder(PROPOSALS_FOLDER_NAME, root);
}

/**
 * Retorna (ou cria) a pasta do Drive para um Lead.
 * Persiste o folderId no banco para evitar buscas repetidas.
 */
export async function getLeadFolder(leadId: string, leadName: string): Promise<string> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { driveFolderId: true },
  });

  if (lead?.driveFolderId) return lead.driveFolderId;

  const proposalsFolder = await getProposalsFolder();
  const folderId = await getOrCreateFolder(leadName, proposalsFolder);

  await prisma.lead.update({
    where: { id: leadId },
    data: { driveFolderId: folderId },
  });

  return folderId;
}

let whatsAppRootFolderId: string | null = null;

async function getWhatsAppRootFolder(): Promise<string> {
  if (whatsAppRootFolderId) return whatsAppRootFolderId;
  const root = await getRootFolder();
  whatsAppRootFolderId = await getOrCreateFolder(WHATSAPP_FOLDER_NAME, root);
  return whatsAppRootFolderId;
}

/**
 * Retorna (ou cria) a pasta do Drive para uma conversa WhatsApp.
 * Estrutura: WB-CRM/WhatsApp/{entityName}/
 */
export async function getWhatsAppFolder(entityName: string): Promise<string> {
  const whatsAppRoot = await getWhatsAppRootFolder();
  return getOrCreateFolder(entityName, whatsAppRoot);
}

/**
 * Retorna (ou cria) a pasta do Drive para uma Organization.
 * Persiste o folderId no banco para evitar buscas repetidas.
 */
export async function getOrganizationFolder(
  organizationId: string,
  organizationName: string
): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { driveFolderId: true },
  });

  if (org?.driveFolderId) return org.driveFolderId;

  const proposalsFolder = await getProposalsFolder();
  const folderId = await getOrCreateFolder(organizationName, proposalsFolder);

  await prisma.organization.update({
    where: { id: organizationId },
    data: { driveFolderId: folderId },
  });

  return folderId;
}
