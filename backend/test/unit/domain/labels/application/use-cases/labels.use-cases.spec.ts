import { describe, it, expect, beforeEach } from "vitest";
import {
  GetLabelsUseCase,
  CreateLabelUseCase,
  UpdateLabelUseCase,
  DeleteLabelUseCase,
} from "@/domain/labels/application/use-cases/labels.use-cases";
import { FakeLabelsRepository } from "../../fakes/fake-labels.repository";
import { Label } from "@/domain/labels/enterprise/entities/label";
import { LabelName } from "@/domain/labels/enterprise/value-objects/label-name.vo";
import { HexColor } from "@/domain/labels/enterprise/value-objects/hex-color.vo";
import { UniqueEntityID } from "@/core/unique-entity-id";

let repo: FakeLabelsRepository;

function seedLabel(name: string, color: string, ownerId: string, id = "label-001"): Label {
  const label = Label.create(
    {
      name: (LabelName.create(name) as any).value,
      color: (HexColor.create(color) as any).value,
      ownerId,
    },
    new UniqueEntityID(id),
  );
  repo.items.push(label);
  return label;
}

beforeEach(() => { repo = new FakeLabelsRepository(); });

// ─── GetLabels ──────────────────────────────────────────────────────────────

describe("GetLabelsUseCase", () => {
  it("returns labels for owner", async () => {
    seedLabel("VIP", "#FF0000", "user-001");
    seedLabel("Urgente", "#00FF00", "user-001");
    seedLabel("Outro", "#0000FF", "user-002");

    const result = await new GetLabelsUseCase(repo).execute("user-001");
    expect(result.isRight()).toBe(true);
    expect(result.value.labels).toHaveLength(2);
  });
});

// ─── CreateLabel ────────────────────────────────────────────────────────────

describe("CreateLabelUseCase", () => {
  it("creates label with valid inputs", async () => {
    const result = await new CreateLabelUseCase(repo).execute({
      name: "Cliente VIP", color: "#FF5733", ownerId: "user-001",
    });
    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(1);
  });

  it("returns left for empty name", async () => {
    const result = await new CreateLabelUseCase(repo).execute({
      name: "", color: "#FF5733", ownerId: "user-001",
    });
    expect(result.isLeft()).toBe(true);
  });

  it("returns left for invalid color", async () => {
    const result = await new CreateLabelUseCase(repo).execute({
      name: "VIP", color: "not-a-color", ownerId: "user-001",
    });
    expect(result.isLeft()).toBe(true);
  });

  it("returns DuplicateLabelError for same name and owner", async () => {
    await new CreateLabelUseCase(repo).execute({ name: "VIP", color: "#FF0000", ownerId: "user-001" });
    const result = await new CreateLabelUseCase(repo).execute({ name: "VIP", color: "#00FF00", ownerId: "user-001" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).name).toBe("DuplicateLabelError");
  });

  it("allows same name for different owners", async () => {
    await new CreateLabelUseCase(repo).execute({ name: "VIP", color: "#FF0000", ownerId: "user-001" });
    const result = await new CreateLabelUseCase(repo).execute({ name: "VIP", color: "#FF0000", ownerId: "user-002" });
    expect(result.isRight()).toBe(true);
  });
});

// ─── UpdateLabel ────────────────────────────────────────────────────────────

describe("UpdateLabelUseCase", () => {
  it("updates name and color", async () => {
    seedLabel("VIP", "#FF0000", "user-001");
    const result = await new UpdateLabelUseCase(repo).execute({
      id: "label-001", name: "Urgente", color: "#00FF00", requesterId: "user-001",
    });
    const { label } = result.unwrap();
    expect(label.name).toBe("Urgente");
    expect(label.color).toBe("#00FF00");
  });

  it("returns LabelNotFoundError for unknown id", async () => {
    const result = await new UpdateLabelUseCase(repo).execute({
      id: "unknown", name: "X", requesterId: "user-001",
    });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).name).toBe("LabelNotFoundError");
  });

  it("returns LabelNotFoundError when requester is not owner", async () => {
    seedLabel("VIP", "#FF0000", "user-001");
    const result = await new UpdateLabelUseCase(repo).execute({
      id: "label-001", name: "X", requesterId: "user-999",
    });
    expect(result.isLeft()).toBe(true);
  });

  it("returns DuplicateLabelError when renaming to existing label", async () => {
    seedLabel("VIP", "#FF0000", "user-001", "label-001");
    seedLabel("Urgente", "#00FF00", "user-001", "label-002");
    const result = await new UpdateLabelUseCase(repo).execute({
      id: "label-001", name: "Urgente", requesterId: "user-001",
    });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).name).toBe("DuplicateLabelError");
  });

  it("allows updating to same name (no-op)", async () => {
    seedLabel("VIP", "#FF0000", "user-001");
    const result = await new UpdateLabelUseCase(repo).execute({
      id: "label-001", name: "VIP", requesterId: "user-001",
    });
    expect(result.isRight()).toBe(true);
  });
});

// ─── DeleteLabel ────────────────────────────────────────────────────────────

describe("DeleteLabelUseCase", () => {
  it("deletes existing label", async () => {
    seedLabel("VIP", "#FF0000", "user-001");
    const result = await new DeleteLabelUseCase(repo).execute({ id: "label-001", requesterId: "user-001" });
    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(0);
  });

  it("returns LabelNotFoundError for unknown id", async () => {
    const result = await new DeleteLabelUseCase(repo).execute({ id: "unknown", requesterId: "user-001" });
    expect(result.isLeft()).toBe(true);
  });

  it("returns LabelNotFoundError when requester is not owner", async () => {
    seedLabel("VIP", "#FF0000", "user-001");
    const result = await new DeleteLabelUseCase(repo).execute({ id: "label-001", requesterId: "user-999" });
    expect(result.isLeft()).toBe(true);
  });
});
