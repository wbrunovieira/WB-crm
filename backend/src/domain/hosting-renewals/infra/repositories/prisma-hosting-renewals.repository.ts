import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { HostingRenewalsRepository, UpcomingRenewal } from "../../application/repositories/hosting-renewals.repository";
import { UniqueEntityID } from "@/core/unique-entity-id";

@Injectable()
export class PrismaHostingRenewalsRepository extends HostingRenewalsRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  async findUpcoming(ownerId: string, daysAhead: number): Promise<UpcomingRenewal[]> {
    const now = new Date();
    const future = new Date(now);
    future.setDate(future.getDate() + daysAhead);

    const orgs = await this.prisma.organization.findMany({
      where: {
        ownerId,
        hasHosting: true,
        hostingRenewalDate: { gte: now, lte: future },
      },
      select: {
        id: true,
        name: true,
        hostingRenewalDate: true,
        ownerId: true,
      },
      orderBy: { hostingRenewalDate: "asc" },
    });

    return orgs.map(org => {
      const diff = Math.ceil((org.hostingRenewalDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        organizationId: org.id,
        organizationName: org.name,
        hostingRenewalDate: org.hostingRenewalDate!,
        ownerId: org.ownerId,
        daysUntilRenewal: diff,
      };
    });
  }

  async createRenewalActivity(input: {
    organizationId: string;
    ownerId: string;
    dueDate: Date;
    subject: string;
  }): Promise<{ activityId: string }> {
    const activity = await this.prisma.activity.create({
      data: {
        id: new UniqueEntityID().toString(),
        type: "task",
        subject: input.subject,
        dueDate: input.dueDate,
        organizationId: input.organizationId,
        ownerId: input.ownerId,
        completed: false,
      },
    });
    return { activityId: activity.id };
  }
}
