"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { uploadFile, deleteFile } from "@/lib/google/drive";
import { getLeadFolder } from "@/lib/google/drive-folders";
import { backendFetch } from "@/lib/backend/client";

export type ProposalStatus = "draft" | "sent" | "accepted" | "rejected";

export interface CreateProposalInput {
  title: string;
  description?: string;
  leadId?: string;
  dealId?: string;
  fileName?: string;
  fileMimeType?: string;
  fileBase64?: string;
}

export interface ProposalRecord {
  id: string;
  title: string;
  leadId: string | null;
  dealId: string | null;
  driveFileId: string | null;
  driveUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  status: ProposalStatus;
  createdAt: string;
}

/** Cria uma proposta, fazendo upload para o Drive quando há arquivo, depois persiste via NestJS */
export async function createProposal(input: CreateProposalInput): Promise<ProposalRecord> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Não autorizado");

  let driveFileId: string | undefined;
  let driveUrl: string | undefined;
  let fileSize: number | undefined;

  if (input.fileBase64 && input.fileName && input.fileMimeType) {
    const content = Buffer.from(input.fileBase64, "base64");
    fileSize = content.length;

    let folderId: string | undefined;
    if (input.leadId) {
      const lead = await backendFetch<{ businessName: string }>(`/leads/${input.leadId}`);
      folderId = await getLeadFolder(input.leadId, lead?.businessName ?? input.leadId);
    }

    const uploaded = await uploadFile({
      name: input.fileName,
      mimeType: input.fileMimeType,
      content,
      folderId,
    });

    driveFileId = uploaded.id;
    driveUrl = uploaded.webViewLink;
  }

  const proposal = await backendFetch<ProposalRecord>("/proposals", {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      leadId: input.leadId,
      dealId: input.dealId,
      fileName: input.fileName,
      fileSize,
      driveFileId,
      driveUrl,
    }),
  });

  if (input.leadId) revalidatePath(`/leads/${input.leadId}`);
  if (input.dealId) revalidatePath(`/deals/${input.dealId}`);

  return proposal;
}

/** Deleta uma proposta e o arquivo do Drive, via NestJS */
export async function deleteProposal(proposalId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Não autorizado");

  const proposal = await backendFetch<{ driveFileId: string | null; leadId: string | null; dealId: string | null }>(`/proposals/${proposalId}`);

  if (proposal?.driveFileId) {
    try {
      await deleteFile(proposal.driveFileId);
    } catch {
      // arquivo pode já ter sido removido do Drive — ignora
    }
  }

  await backendFetch(`/proposals/${proposalId}`, { method: "DELETE" });

  if (proposal?.leadId) revalidatePath(`/leads/${proposal.leadId}`);
  if (proposal?.dealId) revalidatePath(`/deals/${proposal.dealId}`);
}
