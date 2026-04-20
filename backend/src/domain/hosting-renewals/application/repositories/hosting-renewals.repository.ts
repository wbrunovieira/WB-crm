export interface UpcomingRenewal {
  organizationId: string;
  organizationName: string;
  hostingRenewalDate: Date;
  ownerId: string;
  daysUntilRenewal: number;
}

export abstract class HostingRenewalsRepository {
  abstract findUpcoming(ownerId: string, daysAhead: number): Promise<UpcomingRenewal[]>;
  abstract createRenewalActivity(input: {
    organizationId: string;
    ownerId: string;
    dueDate: Date;
    subject: string;
  }): Promise<{ activityId: string }>;
}
