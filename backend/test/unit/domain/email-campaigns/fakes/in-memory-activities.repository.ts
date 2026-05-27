import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";
import type { Activity } from "@/domain/activities/enterprise/entities/activity";

export class InMemoryActivitiesRepository extends ActivitiesRepository {
  items: Activity[] = [];

  async findMany() { return []; }
  async findById() { return null; }
  async findByIdRaw(id: string) {
    return this.items.find((a) => a.id.toString() === id) ?? null;
  }
  async findByIdForTranscription() { return null; }
  async findByTranscriptionJobId() { return null; }
  async findFirst() { return null; }
  async findAnsweredCallsMissingRecordingId() { return []; }
  async findWhatsAppDriveIds() { return []; }
  async markThreadReplied() {}
  async updateEmailOpenStats() {}
  async updateEmailClickStats() {}

  async findByCampaignSendId(sendId: string) {
    return this.items.find((a) => a.emailCampaignSendId === sendId) ?? null;
  }

  async save(activity: Activity) {
    const idx = this.items.findIndex((a) => a.id.equals(activity.id));
    if (idx >= 0) this.items[idx] = activity;
    else this.items.push(activity);
  }

  async delete(id: string) {
    this.items = this.items.filter((a) => a.id.toString() !== id);
  }
}
