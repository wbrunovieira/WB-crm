import type { Activity } from "@/domain/activities/enterprise/entities/activity";
import type { ActivitySummary, ActivityDetail } from "@/domain/activities/enterprise/read-models/activity-read-models";

export interface ActivityFilters {
  type?: string;
  completed?: boolean;
  dealId?: string;
  contactId?: string;
  leadId?: string;
  owner?: string;
  dateFrom?: string;
  dateTo?: string;
  outcome?: string; // "failed" | "skipped"
  includeArchivedLeads?: boolean;
  sortBy?: string;
}

export abstract class ActivitiesRepository {
  abstract findMany(requesterId: string, requesterRole: string, filters?: ActivityFilters): Promise<ActivitySummary[]>;
  abstract findById(id: string, requesterId: string, requesterRole: string): Promise<ActivityDetail | null>;
  abstract findByIdRaw(id: string): Promise<Activity | null>;
  abstract findFirst(where: { gotoCallId?: string }): Promise<Activity | null>;
  abstract save(activity: Activity): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
