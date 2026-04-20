import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { HostingRenewalsRepository, UpcomingRenewal } from "../repositories/hosting-renewals.repository";

export class RenewalOrganizationNotFoundError extends Error { name = "RenewalOrganizationNotFoundError"; }

const DEFAULT_DAYS_AHEAD = 30;

@Injectable()
export class GetUpcomingRenewalsUseCase {
  constructor(private readonly repo: HostingRenewalsRepository) {}

  async execute(input: {
    requesterId: string;
    daysAhead?: number;
  }): Promise<Either<Error, UpcomingRenewal[]>> {
    const renewals = await this.repo.findUpcoming(input.requesterId, input.daysAhead ?? DEFAULT_DAYS_AHEAD);
    return right(renewals);
  }
}

@Injectable()
export class CreateRenewalActivityUseCase {
  constructor(private readonly repo: HostingRenewalsRepository) {}

  async execute(input: {
    organizationId: string;
    requesterId: string;
    dueDate?: Date;
    subject?: string;
  }): Promise<Either<Error, { activityId: string }>> {
    const dueDate = input.dueDate ?? new Date();
    const subject = input.subject ?? "Renovação de hospedagem";

    const result = await this.repo.createRenewalActivity({
      organizationId: input.organizationId,
      ownerId: input.requesterId,
      dueDate,
      subject,
    });
    return right(result);
  }
}
