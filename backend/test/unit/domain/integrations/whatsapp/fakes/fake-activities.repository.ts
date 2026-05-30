import { ActivitiesRepository, ActivityFilters, ActivityWithNames } from "@/domain/activities/application/repositories/activities.repository";
import { Activity } from "@/domain/activities/enterprise/entities/activity";
import type { ActivitySummary, ActivityDetail } from "@/domain/activities/enterprise/read-models/activity-read-models";
import { UniqueEntityID } from "@/core/unique-entity-id";

export class FakeActivitiesRepository extends ActivitiesRepository {
  public items: Activity[] = [];

  async findMany(
    _requesterId: string,
    _requesterRole: string,
    _filters?: ActivityFilters,
  ): Promise<ActivitySummary[]> {
    return [];
  }

  async findById(
    _id: string,
    _requesterId: string,
    _requesterRole: string,
  ): Promise<ActivityDetail | null> {
    return null;
  }

  async findByIdRaw(id: string): Promise<Activity | null> {
    return this.items.find((a) => a.id.toString() === id) ?? null;
  }

  async findFirst(where: { gotoCallId?: string }): Promise<Activity | null> {
    if (where.gotoCallId) {
      return this.items.find((a) => a.gotoCallId === where.gotoCallId) ?? null;
    }
    return null;
  }

  async save(activity: Activity): Promise<void> {
    const idx = this.items.findIndex((a) => a.id.equals(activity.id));
    if (idx >= 0) {
      this.items[idx] = activity;
    } else {
      this.items.push(activity);
    }
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((a) => a.id.toString() !== id);
  }

  async markThreadReplied(_threadId: string): Promise<void> {}

  async findWhatsAppDriveIds(_activityId: string): Promise<string[]> { return []; }

  async updateEmailOpenStats(_trackingToken: string, _openedAt: Date): Promise<void> {}

  async updateEmailClickStats(_trackingToken: string, _clickedAt: Date): Promise<void> {}

  async findByIdForTranscription(id: string): Promise<ActivityWithNames | null> {
    const activity = this.items.find((a) => a.id.toString() === id);
    if (!activity) return null;
    return { activity, ownerName: "Agente", clientName: "Cliente" };
  }

  async findByTranscriptionJobId(jobId: string): Promise<Activity | null> {
    return this.items.find((a) => a.gotoTranscriptionJobId === jobId || a.gotoTranscriptionJobId2 === jobId) ?? null;
  }

  async findAnsweredCallsMissingRecordingId(since: Date): Promise<Activity[]> {
    return this.items.filter(
      (a) => a.gotoCallId !== null && a.gotoRecordingId === null && a.completedAt !== null && a.completedAt! >= since,
    );
  }

  async findByCampaignSendId(sendId: string): Promise<Activity | null> {
    return this.items.find((a) => a.emailCampaignSendId === sendId) ?? null;
  }

  createAndAdd(props: Parameters<typeof Activity.create>[0]): Activity {
    const activity = Activity.create(props, new UniqueEntityID());
    this.items.push(activity);
    return activity;
  }
  async findAnalysisContext(): Promise<null> { return null; }
}
