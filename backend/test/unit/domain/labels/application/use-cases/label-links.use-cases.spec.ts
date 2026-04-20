import { describe, it, expect, beforeEach } from "vitest";
import {
  AddLabelToLeadUseCase,
  RemoveLabelFromLeadUseCase,
  SetLeadLabelsUseCase,
  AddLabelToOrganizationUseCase,
  RemoveLabelFromOrganizationUseCase,
  SetOrganizationLabelsUseCase,
} from "@/domain/labels/application/use-cases/label-links.use-cases";
import { FakeLabelsRepository } from "../../fakes/fake-labels.repository";
import { Label } from "@/domain/labels/enterprise/entities/label";
import { LabelName } from "@/domain/labels/enterprise/value-objects/label-name.vo";
import { HexColor } from "@/domain/labels/enterprise/value-objects/hex-color.vo";
import { UniqueEntityID } from "@/core/unique-entity-id";

let repo: FakeLabelsRepository;

function seedLabel(id: string, ownerId: string): Label {
  const label = Label.create(
    {
      name: (LabelName.create("VIP") as any).value,
      color: (HexColor.create("#FF0000") as any).value,
      ownerId,
    },
    new UniqueEntityID(id),
  );
  repo.items.push(label);
  return label;
}

beforeEach(() => { repo = new FakeLabelsRepository(); });

describe("AddLabelToLeadUseCase", () => {
  it("links label to lead", async () => {
    seedLabel("label-001", "user-001");
    const result = await new AddLabelToLeadUseCase(repo).execute({
      labelId: "label-001", entityId: "lead-001", requesterId: "user-001",
    });
    expect(result.isRight()).toBe(true);
    expect(repo.leadLinks.get("lead-001")?.has("label-001")).toBe(true);
  });

  it("returns LabelNotFoundError for unknown label", async () => {
    const result = await new AddLabelToLeadUseCase(repo).execute({
      labelId: "unknown", entityId: "lead-001", requesterId: "user-001",
    });
    expect(result.isLeft()).toBe(true);
    expect(result.value.name).toBe("LabelNotFoundError");
  });

  it("returns LabelForbiddenError when requester is not owner", async () => {
    seedLabel("label-001", "user-001");
    const result = await new AddLabelToLeadUseCase(repo).execute({
      labelId: "label-001", entityId: "lead-001", requesterId: "user-999",
    });
    expect(result.isLeft()).toBe(true);
    expect(result.value.name).toBe("LabelForbiddenError");
  });
});

describe("RemoveLabelFromLeadUseCase", () => {
  it("removes label from lead", async () => {
    seedLabel("label-001", "user-001");
    await repo.addToLead("label-001", "lead-001");

    const result = await new RemoveLabelFromLeadUseCase(repo).execute({
      labelId: "label-001", entityId: "lead-001", requesterId: "user-001",
    });
    expect(result.isRight()).toBe(true);
    expect(repo.leadLinks.get("lead-001")?.has("label-001")).toBe(false);
  });
});

describe("SetLeadLabelsUseCase", () => {
  it("replaces all labels for a lead", async () => {
    seedLabel("label-001", "user-001");
    seedLabel("label-002", "user-001");
    await repo.addToLead("label-001", "lead-001");

    const result = await new SetLeadLabelsUseCase(repo).execute({
      entityId: "lead-001", labelIds: ["label-002"], requesterId: "user-001",
    });
    expect(result.isRight()).toBe(true);
    expect(repo.leadLinks.get("lead-001")).toEqual(new Set(["label-002"]));
  });

  it("returns LabelForbiddenError if any label belongs to another owner", async () => {
    seedLabel("label-001", "user-001");
    seedLabel("label-002", "user-002");

    const result = await new SetLeadLabelsUseCase(repo).execute({
      entityId: "lead-001", labelIds: ["label-001", "label-002"], requesterId: "user-001",
    });
    expect(result.isLeft()).toBe(true);
  });

  it("allows setting empty label list", async () => {
    const result = await new SetLeadLabelsUseCase(repo).execute({
      entityId: "lead-001", labelIds: [], requesterId: "user-001",
    });
    expect(result.isRight()).toBe(true);
  });
});

describe("AddLabelToOrganizationUseCase", () => {
  it("links label to organization", async () => {
    seedLabel("label-001", "user-001");
    const result = await new AddLabelToOrganizationUseCase(repo).execute({
      labelId: "label-001", entityId: "org-001", requesterId: "user-001",
    });
    expect(result.isRight()).toBe(true);
    expect(repo.orgLinks.get("org-001")?.has("label-001")).toBe(true);
  });
});

describe("RemoveLabelFromOrganizationUseCase", () => {
  it("removes label from organization", async () => {
    seedLabel("label-001", "user-001");
    await repo.addToOrganization("label-001", "org-001");

    const result = await new RemoveLabelFromOrganizationUseCase(repo).execute({
      labelId: "label-001", entityId: "org-001", requesterId: "user-001",
    });
    expect(result.isRight()).toBe(true);
    expect(repo.orgLinks.get("org-001")?.has("label-001")).toBe(false);
  });
});

describe("SetOrganizationLabelsUseCase", () => {
  it("replaces all labels for an organization", async () => {
    seedLabel("label-001", "user-001");
    seedLabel("label-002", "user-001");

    const result = await new SetOrganizationLabelsUseCase(repo).execute({
      entityId: "org-001", labelIds: ["label-001", "label-002"], requesterId: "user-001",
    });
    expect(result.isRight()).toBe(true);
    expect(repo.orgLinks.get("org-001")).toEqual(new Set(["label-001", "label-002"]));
  });
});
