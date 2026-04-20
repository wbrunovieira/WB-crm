import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { ICPRepository, ICPLinkData, LeadICPRecord, OrganizationICPRecord } from "../../application/repositories/icp.repository";
import { ICP, CreateICPProps } from "../../enterprise/entities/icp";
import { ICPStatus } from "../../enterprise/value-objects/icp-status.vo";
import { UniqueEntityID } from "@/core/unique-entity-id";
import type { ICP as PrismaICP } from "@prisma/client";

function toDomain(raw: PrismaICP): ICP {
  const statusResult = ICPStatus.create(raw.status);
  const status = statusResult.isRight() ? (statusResult.value as ICPStatus) : ICPStatus.draft();
  return ICP.create(
    { name: raw.name, slug: raw.slug, content: raw.content, status, ownerId: raw.ownerId, createdAt: raw.createdAt, updatedAt: raw.updatedAt } as CreateICPProps,
    new UniqueEntityID(raw.id),
  ).unwrap();
}

function serializeJsonArray(arr?: string[]): string | null {
  return arr && arr.length > 0 ? JSON.stringify(arr) : null;
}

function toLinkData(raw: Record<string, unknown>): ICPLinkData {
  return {
    matchScore: raw.matchScore as number | undefined,
    notes: raw.notes as string | undefined,
    icpFitStatus: raw.icpFitStatus as string | undefined,
    realDecisionMaker: raw.realDecisionMaker as string | undefined,
    realDecisionMakerOther: raw.realDecisionMakerOther as string | undefined,
    perceivedUrgency: raw.perceivedUrgency ? JSON.parse(raw.perceivedUrgency as string) : undefined,
    businessMoment: raw.businessMoment ? JSON.parse(raw.businessMoment as string) : undefined,
    currentPlatforms: raw.currentPlatforms ? JSON.parse(raw.currentPlatforms as string) : undefined,
    fragmentationLevel: raw.fragmentationLevel as number | undefined,
    mainDeclaredPain: raw.mainDeclaredPain as string | undefined,
    strategicDesire: raw.strategicDesire as string | undefined,
    perceivedTechnicalComplexity: raw.perceivedTechnicalComplexity as number | undefined,
    purchaseTrigger: raw.purchaseTrigger as string | undefined,
    nonClosingReason: raw.nonClosingReason as string | undefined,
    estimatedDecisionTime: raw.estimatedDecisionTime as string | undefined,
    expansionPotential: raw.expansionPotential as number | undefined,
  };
}

function toDbLinkData(data: ICPLinkData) {
  return {
    matchScore: data.matchScore ?? null,
    notes: data.notes ?? null,
    icpFitStatus: data.icpFitStatus ?? null,
    realDecisionMaker: data.realDecisionMaker ?? null,
    realDecisionMakerOther: data.realDecisionMakerOther ?? null,
    perceivedUrgency: serializeJsonArray(data.perceivedUrgency),
    businessMoment: serializeJsonArray(data.businessMoment),
    currentPlatforms: serializeJsonArray(data.currentPlatforms),
    fragmentationLevel: data.fragmentationLevel ?? null,
    mainDeclaredPain: data.mainDeclaredPain ?? null,
    strategicDesire: data.strategicDesire ?? null,
    perceivedTechnicalComplexity: data.perceivedTechnicalComplexity ?? null,
    purchaseTrigger: data.purchaseTrigger ?? null,
    nonClosingReason: data.nonClosingReason ?? null,
    estimatedDecisionTime: data.estimatedDecisionTime ?? null,
    expansionPotential: data.expansionPotential ?? null,
  };
}

@Injectable()
export class PrismaICPRepository extends ICPRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  async findById(id: string): Promise<ICP | null> {
    const raw = await this.prisma.iCP.findUnique({ where: { id } });
    return raw ? toDomain(raw) : null;
  }

  async findByOwner(ownerId: string): Promise<ICP[]> {
    const rows = await this.prisma.iCP.findMany({ where: { ownerId }, orderBy: { name: "asc" } });
    return rows.map(toDomain);
  }

  async existsBySlugAndOwner(slug: string, ownerId: string): Promise<boolean> {
    return (await this.prisma.iCP.count({ where: { slug, ownerId } })) > 0;
  }

  async save(icp: ICP): Promise<void> {
    const data = {
      name: icp.name, slug: icp.slug, content: icp.content,
      status: icp.statusValue, ownerId: icp.ownerId, updatedAt: icp.updatedAt,
    };
    await this.prisma.iCP.upsert({
      where: { id: icp.id.toString() },
      create: { id: icp.id.toString(), ...data, createdAt: icp.createdAt },
      update: data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.iCP.delete({ where: { id } });
  }

  async getLeadICPs(leadId: string): Promise<LeadICPRecord[]> {
    const rows = await this.prisma.leadICP.findMany({ where: { leadId }, include: { icp: true } });
    return rows.map((r) => ({
      id: r.id, leadId: r.leadId, icpId: r.icpId,
      icpName: r.icp.name, icpSlug: r.icp.slug,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
      ...toLinkData(r as unknown as Record<string, unknown>),
    }));
  }

  async linkToLead(icpId: string, leadId: string, data?: ICPLinkData): Promise<void> {
    const linkData = toDbLinkData(data ?? {});
    await this.prisma.leadICP.upsert({
      where: { leadId_icpId: { leadId, icpId } },
      create: { leadId, icpId, ...linkData },
      update: linkData,
    });
  }

  async updateLeadLink(icpId: string, leadId: string, data: ICPLinkData): Promise<void> {
    await this.prisma.leadICP.update({
      where: { leadId_icpId: { leadId, icpId } },
      data: toDbLinkData(data),
    });
  }

  async unlinkFromLead(icpId: string, leadId: string): Promise<void> {
    await this.prisma.leadICP.deleteMany({ where: { leadId, icpId } });
  }

  async getOrganizationICPs(organizationId: string): Promise<OrganizationICPRecord[]> {
    const rows = await this.prisma.organizationICP.findMany({ where: { organizationId }, include: { icp: true } });
    return rows.map((r) => ({
      id: r.id, organizationId: r.organizationId, icpId: r.icpId,
      icpName: r.icp.name, icpSlug: r.icp.slug,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
      ...toLinkData(r as unknown as Record<string, unknown>),
    }));
  }

  async linkToOrganization(icpId: string, organizationId: string, data?: ICPLinkData): Promise<void> {
    const linkData = toDbLinkData(data ?? {});
    await this.prisma.organizationICP.upsert({
      where: { organizationId_icpId: { organizationId, icpId } },
      create: { organizationId, icpId, ...linkData },
      update: linkData,
    });
  }

  async updateOrganizationLink(icpId: string, organizationId: string, data: ICPLinkData): Promise<void> {
    await this.prisma.organizationICP.update({
      where: { organizationId_icpId: { organizationId, icpId } },
      data: toDbLinkData(data),
    });
  }

  async unlinkFromOrganization(icpId: string, organizationId: string): Promise<void> {
    await this.prisma.organizationICP.deleteMany({ where: { organizationId, icpId } });
  }
}
