import { CadencesRepository, LeadCadenceRecord, ApplyCadenceInput, GeneratedActivity } from "@/domain/cadences/application/repositories/cadences.repository";
import { Cadence } from "@/domain/cadences/enterprise/entities/cadence";
import { CadenceStep } from "@/domain/cadences/enterprise/entities/cadence-step";
import { UniqueEntityID } from "@/core/unique-entity-id";

export class InMemoryCadencesRepository extends CadencesRepository {
  cadences: Cadence[] = [];
  steps: CadenceStep[] = [];
  leadCadences: LeadCadenceRecord[] = [];

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
      return {
        leadCadenceId,
        cadenceStepId: step.id.toString(),
        activityId: new UniqueEntityID().toString(),
        scheduledDate: scheduled,
      };
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
    if (lc) { lc.status = "cancelled"; lc.cancelledAt = new Date(); }
  }

  async countActiveLeads(cadenceId: string): Promise<number> {
    return this.leadCadences.filter(lc => lc.cadenceId === cadenceId && lc.status === "active").length;
  }
}
