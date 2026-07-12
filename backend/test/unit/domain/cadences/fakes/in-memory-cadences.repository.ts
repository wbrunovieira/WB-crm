import { CadencesRepository, LeadCadenceRecord, LeadCadenceDetail, AvailableCadenceForLead, ApplyCadenceInput, GeneratedActivity, PartnerCadenceRecord, PartnerCadenceDetail, ApplyPartnerCadenceInput } from "@/domain/cadences/application/repositories/cadences.repository";
import { Cadence } from "@/domain/cadences/enterprise/entities/cadence";
import { CadenceStep } from "@/domain/cadences/enterprise/entities/cadence-step";
import { UniqueEntityID } from "@/core/unique-entity-id";

export class InMemoryCadencesRepository extends CadencesRepository {
  cadences: Cadence[] = [];
  steps: CadenceStep[] = [];
  leadCadences: LeadCadenceRecord[] = [];
  leadCadenceActivities: Array<{
    id: string;
    leadCadenceId: string;
    activityId: string;
    completed: boolean;
    skippedAt?: Date;
    failedAt?: Date;
  }> = [];
  partnerCadences: PartnerCadenceRecord[] = [];
  partnerCadenceActivities: Array<{ id: string; partnerCadenceId: string; activityId: string; completed: boolean; skippedAt?: Date; failedAt?: Date }> = [];

  async findById(id: string): Promise<Cadence | null> {
    return this.cadences.find(c => c.id.toString() === id) ?? null;
  }

  async findByOwner(ownerId: string): Promise<Cadence[]> {
    return this.cadences.filter(c => c.ownerId === ownerId);
  }

  async existsBySlugAndOwner(slug: string, ownerId: string, excludeId?: string): Promise<boolean> {
    return this.cadences.some(c =>
      c.slug === slug && c.ownerId === ownerId && c.id.toString() !== excludeId
    );
  }

  async save(cadence: Cadence): Promise<void> {
    const idx = this.cadences.findIndex(c => c.id.equals(cadence.id));
    if (idx >= 0) this.cadences[idx] = cadence;
    else this.cadences.push(cadence);
  }

  async delete(id: string): Promise<void> {
    this.cadences = this.cadences.filter(c => c.id.toString() !== id);
    this.steps = this.steps.filter(s => s.cadenceId !== id);
  }

  async findStepsByCadence(cadenceId: string): Promise<CadenceStep[]> {
    return this.steps.filter(s => s.cadenceId === cadenceId).sort((a, b) => a.order - b.order);
  }

  async findStepById(id: string): Promise<CadenceStep | null> {
    return this.steps.find(s => s.id.toString() === id) ?? null;
  }

  async saveStep(step: CadenceStep): Promise<void> {
    const idx = this.steps.findIndex(s => s.id.equals(step.id));
    if (idx >= 0) this.steps[idx] = step;
    else this.steps.push(step);
  }

  async deleteStep(id: string): Promise<void> {
    this.steps = this.steps.filter(s => s.id.toString() !== id);
  }

  async reorderSteps(cadenceId: string, orderedStepIds: string[]): Promise<void> {
    orderedStepIds.forEach((id, index) => {
      const step = this.steps.find(s => s.id.toString() === id && s.cadenceId === cadenceId);
      if (step) step.update({ order: index });
    });
  }

  async applyToLead(input: ApplyCadenceInput, steps: CadenceStep[]): Promise<{ leadCadenceId: string; activities: GeneratedActivity[] }> {
    const leadCadenceId = new UniqueEntityID().toString();
    this.leadCadences.push({
      id: leadCadenceId,
      leadId: input.leadId,
      cadenceId: input.cadenceId,
      status: "active",
      startDate: input.startDate,
      currentStep: 0,
      notes: input.notes,
      ownerId: input.ownerId,
    });
    const activities: GeneratedActivity[] = steps.map(step => {
      const scheduled = new Date(input.startDate);
      scheduled.setDate(scheduled.getDate() + (step.dayNumber - 1));
      const activityId = new UniqueEntityID().toString();
      this.leadCadenceActivities.push({ id: new UniqueEntityID().toString(), leadCadenceId, activityId, completed: false });
      return { leadCadenceId, cadenceStepId: step.id.toString(), activityId, scheduledDate: scheduled };
    });
    return { leadCadenceId, activities };
  }

  async getLeadCadences(leadId: string): Promise<LeadCadenceRecord[]> {
    return this.leadCadences.filter(lc => lc.leadId === leadId);
  }

  async findLeadCadenceById(id: string): Promise<LeadCadenceRecord | null> {
    return this.leadCadences.find(lc => lc.id === id) ?? null;
  }

  async pauseLeadCadence(id: string): Promise<void> {
    const lc = this.leadCadences.find(l => l.id === id);
    if (lc) { lc.status = "paused"; lc.pausedAt = new Date(); }
  }

  async resumeLeadCadence(id: string): Promise<void> {
    const lc = this.leadCadences.find(l => l.id === id);
    if (lc) { lc.status = "active"; lc.pausedAt = undefined; }
  }

  async cancelLeadCadence(id: string): Promise<void> {
    const lc = this.leadCadences.find(l => l.id === id);
    if (!lc) return;
    const now = new Date();
    lc.status = "cancelled";
    lc.cancelledAt = now;
    for (const a of this.leadCadenceActivities.filter(a => a.leadCadenceId === id)) {
      if (!a.completed && !a.failedAt && !a.skippedAt) a.skippedAt = now;
    }
  }

  async countActiveLeads(cadenceId: string): Promise<number> {
    return this.leadCadences.filter(lc => lc.cadenceId === cadenceId && lc.status === "active").length;
  }

  async getLeadCadencesDetail(_leadId: string): Promise<LeadCadenceDetail[]> {
    return [];
  }

  async completeLeadCadence(id: string, _disqualificationReason?: string): Promise<void> {
    const lc = this.leadCadences.find(l => l.id === id);
    if (lc) { lc.status = "completed"; lc.completedAt = new Date(); }
  }

  async cancelAllActiveCadencesByTemplate(_cadenceId: string): Promise<{ cancelledIds: string[]; skippedActivitiesCount: number }> {
    return { cancelledIds: [], skippedActivitiesCount: 0 };
  }

  async getAvailableCadencesForLead(_leadId: string, _ownerId: string): Promise<AvailableCadenceForLead[]> {
    return [];
  }

  async registerLeadReply(_leadId: string, _ownerId: string, _channel: string, _notes?: string): Promise<{ activityId: string; cancelledCadences: number; skippedActivities: number }> {
    return { activityId: "", cancelledCadences: 0, skippedActivities: 0 };
  }

  // ── Partner cadence ──
  async applyToPartner(input: ApplyPartnerCadenceInput, steps: CadenceStep[]): Promise<{ partnerCadenceId: string; activities: GeneratedActivity[] }> {
    const partnerCadenceId = new UniqueEntityID().toString();
    this.partnerCadences.push({
      id: partnerCadenceId, partnerId: input.partnerId, cadenceId: input.cadenceId,
      status: "active", startDate: input.startDate, currentStep: 0, notes: input.notes, ownerId: input.ownerId,
    });
    const activities: GeneratedActivity[] = steps.map(step => {
      const scheduled = new Date(input.startDate);
      scheduled.setDate(scheduled.getDate() + (step.dayNumber - 1));
      const activityId = new UniqueEntityID().toString();
      this.partnerCadenceActivities.push({ id: new UniqueEntityID().toString(), partnerCadenceId, activityId, completed: false });
      return { leadCadenceId: partnerCadenceId, cadenceStepId: step.id.toString(), activityId, scheduledDate: scheduled };
    });
    return { partnerCadenceId, activities };
  }

  async findPartnerCadenceById(id: string): Promise<PartnerCadenceRecord | null> {
    return this.partnerCadences.find(pc => pc.id === id) ?? null;
  }

  async pausePartnerCadence(id: string): Promise<void> {
    const pc = this.partnerCadences.find(p => p.id === id);
    if (pc) { pc.status = "paused"; pc.pausedAt = new Date(); }
  }

  async resumePartnerCadence(id: string): Promise<void> {
    const pc = this.partnerCadences.find(p => p.id === id);
    if (pc) { pc.status = "active"; pc.pausedAt = undefined; }
  }

  async cancelPartnerCadence(id: string): Promise<void> {
    const pc = this.partnerCadences.find(p => p.id === id);
    if (!pc) return;
    const now = new Date();
    pc.status = "cancelled"; pc.cancelledAt = now;
    for (const a of this.partnerCadenceActivities.filter(a => a.partnerCadenceId === id)) {
      if (!a.completed && !a.failedAt && !a.skippedAt) a.skippedAt = now;
    }
  }

  async completePartnerCadence(id: string, _disqualificationReason?: string): Promise<void> {
    const pc = this.partnerCadences.find(p => p.id === id);
    if (pc) { pc.status = "completed"; pc.completedAt = new Date(); }
  }

  async getPartnerCadencesDetail(_partnerId: string): Promise<PartnerCadenceDetail[]> {
    return [];
  }

  async getAvailableCadencesForPartner(_partnerId: string, _ownerId: string): Promise<AvailableCadenceForLead[]> {
    return [];
  }

  async registerPartnerReply(_partnerId: string, _ownerId: string, _channel: string, _notes?: string): Promise<{ activityId: string; cancelledCadences: number; skippedActivities: number }> {
    return { activityId: "", cancelledCadences: 0, skippedActivities: 0 };
  }
}
