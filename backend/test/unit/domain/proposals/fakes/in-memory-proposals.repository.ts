import { ProposalsRepository, ProposalFilters } from "@/domain/proposals/application/repositories/proposals.repository";
import { Proposal } from "@/domain/proposals/enterprise/entities/proposal";

export class InMemoryProposalsRepository extends ProposalsRepository {
  items: Proposal[] = [];

  async findById(id: string): Promise<Proposal | null> {
    return this.items.find(p => p.id.toString() === id) ?? null;
  }

  async findByOwner(ownerId: string, filters?: ProposalFilters): Promise<Proposal[]> {
    return this.items.filter(p => {
      if (p.ownerId !== ownerId) return false;
      if (filters?.leadId && p.leadId !== filters.leadId) return false;
      if (filters?.dealId && p.dealId !== filters.dealId) return false;
      if (filters?.status && p.status !== filters.status) return false;
      return true;
    });
  }

  async save(proposal: Proposal): Promise<void> {
    const idx = this.items.findIndex(p => p.id.equals(proposal.id));
    if (idx >= 0) this.items[idx] = proposal;
    else this.items.push(proposal);
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter(p => p.id.toString() !== id);
  }
}
