"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { uploadFile, deleteFile } from "@/lib/google/drive";
import { getLeadFolder, getOrganizationFolder } from "@/lib/google/drive-folders";

export type ProposalStatus = "draft" | "sent" | "accepted" | "rejected";

export interface CreateProposalInput {
  title: string;
  description?: string;
  leadId?: string;
  dealId?: string;
  // Arquivo para upload no Drive (opcional)
  fileName?: string;
  fileMimeType?: string;
  fileBase64?: string; // conteúdo em base64
}

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Não autorizado");
  return session;
}

async function requireProposalOwnership(proposalId: string, userId: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: { id: true, ownerId: true, driveFileId: true, leadId: true, dealId: true },
  });
  if (!proposal) throw new Error("Proposta não encontrada");
  if (proposal.ownerId !== userId) throw new Error("Acesso negado");
  return proposal;
}

/** Lista propostas de um Lead ou Deal */
export async function getProposals({
  leadId,
  dealId,
}: {
  leadId?: string;
  dealId?: string;
}) {
  await requireSession();

  return prisma.proposal.findMany({
    where: {
      ...(leadId ? { leadId } : {}),
      ...(dealId ? { dealId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Cria uma proposta, fazendo upload para o Drive quando há arquivo */
export async function createProposal(input: CreateProposalInput) {
  const session = await requireSession();
  const userId = session.user.id;

  let driveFileId: string | undefined;
  let driveUrl: string | undefined;
  let fileSize: number | undefined;

  if (input.fileBase64 && input.fileName && input.fileMimeType) {
    const content = Buffer.from(input.fileBase64, "base64");
    fileSize = content.length;

    // Determina pasta no Drive com base no contexto (lead ou deal)
    let folderId: string | undefined;
    if (input.leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: input.leadId },
        select: { businessName: true },
      });
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

  const proposal = await prisma.proposal.create({
    data: {
      title: input.title,
      description: input.description,
      leadId: input.leadId,
      dealId: input.dealId,
      ownerId: userId,
      status: "draft",
      driveFileId,
      driveUrl,
      fileName: input.fileName,
      fileSize,
    },
  });

  if (input.leadId) revalidatePath(`/leads/${input.leadId}`);
  if (input.dealId) revalidatePath(`/deals/${input.dealId}`);

  return proposal;
}

/** Atualiza o status de uma proposta */
export async function updateProposalStatus(
  proposalId: string,
  status: ProposalStatus
) {
  const session = await requireSession();
  await requireProposalOwnership(proposalId, session.user.id);

  const updated = await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      status,
      ...(status === "sent" ? { sentAt: new Date() } : {}),
    },
  });

  if (updated.leadId) revalidatePath(`/leads/${updated.leadId}`);
  if (updated.dealId) revalidatePath(`/deals/${updated.dealId}`);

  return updated;
}

/** Deleta uma proposta (e o arquivo do Drive, se houver) */
export async function deleteProposal(proposalId: string) {
  const session = await requireSession();
  const proposal = await requireProposalOwnership(proposalId, session.user.id);

  // Remove arquivo do Drive se existir (não bloqueia se já foi removido)
  if (proposal.driveFileId) {
    try {
      await deleteFile(proposal.driveFileId);
    } catch {
      // arquivo pode já ter sido removido do Drive — ignora
    }
  }

  await prisma.proposal.delete({ where: { id: proposalId } });

  if (proposal.leadId) revalidatePath(`/leads/${proposal.leadId}`);
  if (proposal.dealId) revalidatePath(`/deals/${proposal.dealId}`);
}
