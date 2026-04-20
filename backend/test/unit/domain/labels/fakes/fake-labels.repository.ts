import { LabelsRepository } from "@/domain/labels/application/repositories/labels.repository";
import { Label } from "@/domain/labels/enterprise/entities/label";

export class FakeLabelsRepository extends LabelsRepository {
  public items: Label[] = [];

  async findById(id: string): Promise<Label | null> {
    return this.items.find((l) => l.id.toString() === id) ?? null;
  }

  async findByOwner(ownerId: string): Promise<Label[]> {
    return this.items.filter((l) => l.ownerId === ownerId);
  }

  async existsByNameAndOwner(name: string, ownerId: string): Promise<boolean> {
    return this.items.some((l) => l.name === name && l.ownerId === ownerId);
  }

  async save(label: Label): Promise<void> {
    const idx = this.items.findIndex((l) => l.id.toString() === label.id.toString());
    if (idx >= 0) this.items[idx] = label;
    else this.items.push(label);
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((l) => l.id.toString() !== id);
  }
}
