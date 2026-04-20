import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { ProposalsRepository, ProposalFilters } from "../../application/repositories/proposals.repository";
import { Proposal } from "../../enterprise/entities/proposal";
import { UniqueEntityID } from "@/core/unique-entity-id";

function map(raw: Record<string, unknown>): Proposal {
  return Proposal.create(
    {
      title: raw.title as string,
      description: raw.description as string | undefined,
      status: raw.status as string,
      driveFileId: raw.driveFileId as string | undefined,
      driveUrl: raw.driveUrl as string | undefined,
      fileName: raw.fileName as string | undefined,
      fileSize: raw.fileSize as number | undefined,
      sentAt: raw.sentAt as Date | undefined,
      leadId: raw.leadId as string | undefined,
      dealId: raw.dealId as string | undefined,
      ownerId: raw.ownerId as string,
      createdAt: raw.createdAt as Date,
      updatedAt: raw.updatedAt as Date,
    },
    new UniqueEntityID(raw.id as string),
  ).unwrap() as Proposal;
}

@Injectable()
export class PrismaProposalsRepository extends ProposalsRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  async findById(id: string): Promise<Proposal | null> {
    const raw = await this.prisma.proposal.findUnique({ where: { id } });
    if (!raw) return null;
    return map(raw as unknown as Record<string, unknown>);
  }

  async findByOwner(ownerId: string, filters?: ProposalFilters): Promise<Proposal[]> {
    const rows = await this.prisma.proposal.findMany({
      where: {
        ownerId,
        ...(filters?.leadId ? { leadId: filters.leadId } : {}),
        ...(filters?.dealId ? { dealId: filters.dealId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(r => map(r as unknown as Record<string, unknown>));
  }

  async save(proposal: Proposal): Promise<void> {
    const data = {
      title: proposal.title,
      description: proposal.description ?? null,
      status: proposal.status,
      driveFileId: proposal.driveFileId ?? null,
      driveUrl: proposal.driveUrl ?? null,
      fileName: proposal.fileName ?? null,
      fileSize: proposal.fileSize ?? null,
      sentAt: proposal.sentAt ?? null,
      leadId: proposal.leadId ?? null,
      dealId: proposal.dealId ?? null,
      ownerId: proposal.ownerId,
    };
    await this.prisma.proposal.upsert({
      where: { id: proposal.id.toString() },
      create: { id: proposal.id.toString(), ...data },
      update: data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.proposal.delete({ where: { id } });
  }
}
