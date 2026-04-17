import { describe, it, expect } from "vitest";
import { Entity } from "@/core/entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

interface FakeProps {
  name: string;
}

class FakeEntity extends Entity<FakeProps> {
  get name() {
    return this.props.name;
  }

  static create(props: FakeProps, id?: UniqueEntityID) {
    return new FakeEntity(props, id);
  }
}

describe("Entity", () => {
  it("gera id automático quando não fornecido", () => {
    const entity = FakeEntity.create({ name: "test" });
    expect(entity.id.value).toBeTruthy();
  });

  it("usa o id fornecido", () => {
    const id = new UniqueEntityID("specific-id");
    const entity = FakeEntity.create({ name: "test" }, id);
    expect(entity.id.value).toBe("specific-id");
  });

  it("equals retorna true para a mesma referência", () => {
    const entity = FakeEntity.create({ name: "test" });
    expect(entity.equals(entity)).toBe(true);
  });

  it("equals retorna true para entidades com o mesmo id", () => {
    const id = new UniqueEntityID("same");
    const a = FakeEntity.create({ name: "A" }, id);
    const b = FakeEntity.create({ name: "B" }, id);
    expect(a.equals(b)).toBe(true);
  });

  it("equals retorna false para entidades com ids diferentes", () => {
    const a = FakeEntity.create({ name: "A" });
    const b = FakeEntity.create({ name: "B" });
    expect(a.equals(b)).toBe(false);
  });
});
