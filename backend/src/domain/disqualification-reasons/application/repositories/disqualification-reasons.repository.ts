import { DisqualificationReason } from "../../enterprise/entities/disqualification-reason";

export abstract class DisqualificationReasonsRepository {
  abstract findByOwner(ownerId: string): Promise<DisqualificationReason[]>;
  abstract findById(id: string): Promise<DisqualificationReason | null>;
  abstract existsByNameAndOwner(name: string, ownerId: string): Promise<boolean>;
  abstract save(reason: DisqualificationReason): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
