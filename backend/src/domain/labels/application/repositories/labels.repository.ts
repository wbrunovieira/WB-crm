import { Label } from "../../enterprise/entities/label";

export abstract class LabelsRepository {
  abstract findById(id: string): Promise<Label | null>;
  abstract findByOwner(ownerId: string): Promise<Label[]>;
  abstract existsByNameAndOwner(name: string, ownerId: string): Promise<boolean>;
  abstract save(label: Label): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
