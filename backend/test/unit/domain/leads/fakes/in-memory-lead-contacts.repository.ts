import { LeadContactsRepository, LeadContactRecord, CreateLeadContactData, UpdateLeadContactData } from "@/domain/leads/application/repositories/lead-contacts.repository";
import { randomUUID } from "crypto";

export class InMemoryLeadContactsRepository extends LeadContactsRepository {
  public items: LeadContactRecord[] = [];

  async findByLead(leadId: string): Promise<LeadContactRecord[]> {
    return this.items.filter((c) => c.leadId === leadId);
  }

  async findById(id: string): Promise<LeadContactRecord | null> {
    return this.items.find((c) => c.id === id) ?? null;
  }

  async create(data: CreateLeadContactData): Promise<LeadContactRecord> {
    const record: LeadContactRecord = {
      id: randomUUID(),
      leadId: data.leadId,
      name: data.name,
      role: data.role ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      whatsapp: data.whatsapp ?? null,
      linkedin: data.linkedin ?? null,
      instagram: data.instagram ?? null,
      isPrimary: data.isPrimary ?? false,
      isActive: true,
      languages: data.languages ?? null,
      convertedToContactId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.items.push(record);
    return record;
  }

  async update(id: string, data: UpdateLeadContactData): Promise<LeadContactRecord> {
    const idx = this.items.findIndex((c) => c.id === id);
    const existing = this.items[idx];
    const updated: LeadContactRecord = {
      ...existing,
      name: data.name ?? existing.name,
      role: data.role !== undefined ? (data.role ?? null) : existing.role,
      email: data.email !== undefined ? (data.email ?? null) : existing.email,
      phone: data.phone !== undefined ? (data.phone ?? null) : existing.phone,
      whatsapp: data.whatsapp !== undefined ? (data.whatsapp ?? null) : existing.whatsapp,
      linkedin: data.linkedin !== undefined ? (data.linkedin ?? null) : existing.linkedin,
      instagram: data.instagram !== undefined ? (data.instagram ?? null) : existing.instagram,
      isPrimary: data.isPrimary ?? existing.isPrimary,
      languages: data.languages !== undefined ? (data.languages ?? null) : existing.languages,
      updatedAt: new Date(),
    };
    this.items[idx] = updated;
    return updated;
  }

  async toggleActive(id: string): Promise<LeadContactRecord> {
    const idx = this.items.findIndex((c) => c.id === id);
    const existing = this.items[idx];
    const updated: LeadContactRecord = { ...existing, isActive: !existing.isActive, updatedAt: new Date() };
    this.items[idx] = updated;
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((c) => c.id !== id);
  }
}
