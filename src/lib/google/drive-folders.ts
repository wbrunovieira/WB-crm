import { backendFetch } from "@/lib/backend/client";
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

export async function getLeadFolder(leadId: string, leadName: string): Promise<string> {
  const lead = await backendFetch<{ id: string; driveFolderId: string | null }>(`/leads/${leadId}`);

  if (lead?.driveFolderId) return lead.driveFolderId;

  const proposalsFolder = await getProposalsFolder();
  const folderId = await getOrCreateFolder(leadName, proposalsFolder);

  await backendFetch(`/leads/${leadId}`, {
    method: "PATCH",
    body: JSON.stringify({ driveFolderId: folderId }),
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

export async function getWhatsAppFolder(entityName: string): Promise<string> {
  const whatsAppRoot = await getWhatsAppRootFolder();
  return getOrCreateFolder(entityName, whatsAppRoot);
}

export async function getOrganizationFolder(
  organizationId: string,
  organizationName: string
): Promise<string> {
  const org = await backendFetch<{ id: string; driveFolderId: string | null }>(`/organizations/${organizationId}`);

  if (org?.driveFolderId) return org.driveFolderId;

  const proposalsFolder = await getProposalsFolder();
  const folderId = await getOrCreateFolder(organizationName, proposalsFolder);

  await backendFetch(`/organizations/${organizationId}`, {
    method: "PATCH",
    body: JSON.stringify({ driveFolderId: folderId }),
  });

  return folderId;
}
