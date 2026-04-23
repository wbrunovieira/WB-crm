import { ActivitiesRepository, ActivityFilters, ActivityWithNames } from "@/domain/activities/application/repositories/activities.repository";
import { Activity } from "@/domain/activities/enterprise/entities/activity";
import type { ActivitySummary, ActivityDetail } from "@/domain/activities/enterprise/read-models/activity-read-models";
import { UniqueEntityID } from "@/core/unique-entity-id";

export class FakeActivitiesRepository extends ActivitiesRepository {
  public items: Activity[] = [];
  private nameMap: Map<string, { ownerName: string; clientName: string }> = new Map();

  setNames(activityId: string, names: { ownerName: string; clientName: string }): void {
    this.nameMap.set(activityId, names);
  }

  async findMany(_requesterId: string, _requesterRole: string, _filters?: ActivityFilters): Promise<ActivitySummary[]> {
    return [];
  }

  async findById(_id: string, _requesterId: string, _requesterRole: string): Promise<ActivityDetail | null> {
    return null;
  }

  async findByIdRaw(id: string): Promise<Activity | null> {
    return this.items.find((a) => a.id.toString() === id) ?? null;
  }

  async findByTranscriptionJobId(jobId: string): Promise<Activity | null> {
    return (
      this.items.find(
        (a) => a.gotoTranscriptionJobId === jobId || a.gotoTranscriptionJobId2 === jobId,
      ) ?? null
    );
  }

  async findByIdForTranscription(id: string): Promise<ActivityWithNames | null> {
    const activity = this.items.find((a) => a.id.toString() === id);
    if (!activity) return null;
    const names = this.nameMap.get(id);
    return {
      activity,
      ownerName: names?.ownerName ?? "Agente",
      clientName: names?.clientName ?? "Cliente",
    };
  }

  async findFirst(where: { gotoCallId?: string }): Promise<Activity | null> {
    if (where.gotoCallId) {
      return this.items.find((a) => a.gotoCallId === where.gotoCallId) ?? null;
    }
    return null;
  }

  async findManyRaw(where: {
    gotoRecordingId?: { not: null };
    gotoRecordingUrl?: null;
    completedAt?: { gte: Date };
  }): Promise<Activity[]> {
    return this.items.filter((a) => {
      if (where.gotoRecordingId?.not === null && !a.gotoRecordingId) return false;
      if (where.gotoRecordingUrl === null && a.gotoRecordingUrl) return false;
      if (where.completedAt?.gte && a.completedAt && a.completedAt < where.completedAt.gte) return false;
      return true;
    });
  }

  async findManyWithPendingJobs(): Promise<Activity[]> {
    return this.items.filter(
      (a) => !a.gotoTranscriptText && (a.gotoTranscriptionJobId || a.gotoTranscriptionJobId2),
    );
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

  // Helper for tests
  createAndAdd(props: Parameters<typeof Activity.create>[0]): Activity {
    const activity = Activity.create(props, new UniqueEntityID());
    this.items.push(activity);
    return activity;
  }
}
