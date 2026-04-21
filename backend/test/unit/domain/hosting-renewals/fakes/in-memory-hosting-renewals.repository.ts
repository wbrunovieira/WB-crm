import { HostingRenewalsRepository, UpcomingRenewal } from "@/domain/hosting-renewals/application/repositories/hosting-renewals.repository";
import { UniqueEntityID } from "@/core/unique-entity-id";

export interface FakeOrganization {
  id: string;
  name: string;
  hostingRenewalDate: Date;
  ownerId: string;
}

export class InMemoryHostingRenewalsRepository extends HostingRenewalsRepository {
  organizations: FakeOrganization[] = [];
  activities: Array<{ id: string; organizationId: string; ownerId: string; dueDate: Date; subject: string }> = [];

  async findUpcoming(ownerId: string, daysAhead: number): Promise<UpcomingRenewal[]> {
    const now = new Date();
    const future = new Date(now);
    future.setDate(future.getDate() + daysAhead);

    return this.organizations
      .filter(org => {
        if (org.ownerId !== ownerId) return false;
        return org.hostingRenewalDate >= now && org.hostingRenewalDate <= future;
      })
      .map(org => {
        const diff = Math.ceil((org.hostingRenewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          organizationId: org.id,
          organizationName: org.name,
          hostingRenewalDate: org.hostingRenewalDate,
          ownerId: org.ownerId,
          daysUntilRenewal: diff,
          hostingPlan: null,
          hostingValue: null,
        };
      })
      .sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal);
  }

  async createRenewalActivity(input: { organizationId: string; ownerId: string; dueDate: Date; subject: string }): Promise<{ activityId: string }> {
    const activityId = new UniqueEntityID().toString();
    this.activities.push({ id: activityId, ...input });
    return { activityId };
  }
}
