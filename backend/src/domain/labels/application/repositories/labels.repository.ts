import { Label } from "../../enterprise/entities/label";

export abstract class LabelsRepository {
  abstract findById(id: string): Promise<Label | null>;
  abstract findByOwner(ownerId: string): Promise<Label[]>;
  abstract existsByNameAndOwner(name: string, ownerId: string): Promise<boolean>;
  abstract save(label: Label): Promise<void>;
  abstract delete(id: string): Promise<void>;

  // Lead links
  abstract addToLead(labelId: string, leadId: string): Promise<void>;
  abstract removeFromLead(labelId: string, leadId: string): Promise<void>;
  abstract setLeadLabels(leadId: string, labelIds: string[]): Promise<void>;

  // Organization links
  abstract addToOrganization(labelId: string, organizationId: string): Promise<void>;
  abstract removeFromOrganization(labelId: string, organizationId: string): Promise<void>;
  abstract setOrganizationLabels(organizationId: string, labelIds: string[]): Promise<void>;
}
