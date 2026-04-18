import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryPipelinesRepository } from "../../repositories/in-memory-pipelines.repository";
import { GetPipelinesUseCase } from "@/domain/pipelines/application/use-cases/get-pipelines.use-case";
import { GetPipelineByIdUseCase } from "@/domain/pipelines/application/use-cases/get-pipeline-by-id.use-case";
import { CreatePipelineUseCase } from "@/domain/pipelines/application/use-cases/create-pipeline.use-case";
import { UpdatePipelineUseCase } from "@/domain/pipelines/application/use-cases/update-pipeline.use-case";
import { DeletePipelineUseCase } from "@/domain/pipelines/application/use-cases/delete-pipeline.use-case";
import { SetDefaultPipelineUseCase } from "@/domain/pipelines/application/use-cases/set-default-pipeline.use-case";
import { CreateStageUseCase } from "@/domain/pipelines/application/use-cases/create-stage.use-case";
import { UpdateStageUseCase } from "@/domain/pipelines/application/use-cases/update-stage.use-case";
import { DeleteStageUseCase } from "@/domain/pipelines/application/use-cases/delete-stage.use-case";
import { ReorderStagesUseCase } from "@/domain/pipelines/application/use-cases/reorder-stages.use-case";

describe("Pipelines Use Cases", () => {
  let repo: InMemoryPipelinesRepository;
  let getList: GetPipelinesUseCase;
  let getById: GetPipelineByIdUseCase;
  let create: CreatePipelineUseCase;
  let update: UpdatePipelineUseCase;
  let remove: DeletePipelineUseCase;
  let setDefault: SetDefaultPipelineUseCase;
  let createStage: CreateStageUseCase;
  let updateStage: UpdateStageUseCase;
  let deleteStage: DeleteStageUseCase;
  let reorderStages: ReorderStagesUseCase;

  beforeEach(() => {
    repo = new InMemoryPipelinesRepository();
    getList = new GetPipelinesUseCase(repo);
    getById = new GetPipelineByIdUseCase(repo);
    create = new CreatePipelineUseCase(repo);
    update = new UpdatePipelineUseCase(repo);
    remove = new DeletePipelineUseCase(repo);
    setDefault = new SetDefaultPipelineUseCase(repo);
    createStage = new CreateStageUseCase(repo);
    updateStage = new UpdateStageUseCase(repo);
    deleteStage = new DeleteStageUseCase(repo);
    reorderStages = new ReorderStagesUseCase(repo);
  });

  // ─── CreatePipelineUseCase ──────────────────────────────────────────────

  describe("CreatePipelineUseCase", () => {
    it("cria pipeline com nome válido e auto-cria 4 estágios padrão", async () => {
      const result = await create.execute({ name: "Vendas B2B" });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.pipeline.name).toBe("Vendas B2B");
        expect(result.value.pipeline.isDefault).toBe(false);
      }
      expect(repo.pipelines).toHaveLength(1);
      expect(repo.stages).toHaveLength(4);
      const stageNames = repo.stages.map((s) => s.name);
      expect(stageNames).toContain("Qualificação");
      expect(stageNames).toContain("Fechamento");
    });

    it("cria pipeline como padrão e faz clearDefault antes", async () => {
      await create.execute({ name: "Pipeline Antigo", isDefault: true });
      const result = await create.execute({ name: "Pipeline Novo", isDefault: true });

      expect(result.isRight()).toBe(true);
      const defaults = repo.pipelines.filter((p) => p.isDefault);
      expect(defaults).toHaveLength(1);
      expect(defaults[0].name).toBe("Pipeline Novo");
    });

    it("retorna erro quando nome é vazio", async () => {
      const result = await create.execute({ name: "  " });
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.message).toContain("obrigatório");
      }
    });

    it("faz trim no nome", async () => {
      const result = await create.execute({ name: "  Vendas  " });
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.pipeline.name).toBe("Vendas");
      }
    });
  });

  // ─── GetPipelinesUseCase ────────────────────────────────────────────────

  describe("GetPipelinesUseCase", () => {
    it("retorna lista de pipelines com estágios", async () => {
      await create.execute({ name: "Pipeline A" });
      await create.execute({ name: "Pipeline B" });

      const result = await getList.execute();
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.pipelines).toHaveLength(2);
        expect(result.value.pipelines[0].stages).toHaveLength(4);
      }
    });

    it("retorna lista vazia quando não há pipelines", async () => {
      const result = await getList.execute();
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.pipelines).toHaveLength(0);
      }
    });
  });

  // ─── GetPipelineByIdUseCase ─────────────────────────────────────────────

  describe("GetPipelineByIdUseCase", () => {
    it("retorna pipeline existente com estágios", async () => {
      const created = await create.execute({ name: "Pipeline Detalhe" });
      const id = created.isRight() ? created.value.pipeline.id.toString() : "";

      const result = await getById.execute(id);
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.pipeline.name).toBe("Pipeline Detalhe");
        expect(result.value.pipeline.stages).toHaveLength(4);
      }
    });

    it("retorna erro quando pipeline não existe", async () => {
      const result = await getById.execute("nao-existe");
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.message).toContain("não encontrado");
      }
    });
  });

  // ─── UpdatePipelineUseCase ──────────────────────────────────────────────

  describe("UpdatePipelineUseCase", () => {
    it("atualiza nome do pipeline", async () => {
      const created = await create.execute({ name: "Original" });
      const id = created.isRight() ? created.value.pipeline.id.toString() : "";

      const result = await update.execute({ id, name: "Atualizado" });
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.pipeline.name).toBe("Atualizado");
      }
    });

    it("definir isDefault=true faz clearDefault dos demais", async () => {
      const a = await create.execute({ name: "A", isDefault: true });
      const b = await create.execute({ name: "B" });
      const idB = b.isRight() ? b.value.pipeline.id.toString() : "";
      const idA = a.isRight() ? a.value.pipeline.id.toString() : "";

      await update.execute({ id: idB, isDefault: true });

      const pipelineA = repo.pipelines.find((p) => p.id.toString() === idA);
      expect(pipelineA?.isDefault).toBe(false);
    });

    it("retorna erro quando pipeline não existe", async () => {
      const result = await update.execute({ id: "nao-existe", name: "X" });
      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── DeletePipelineUseCase ──────────────────────────────────────────────

  describe("DeletePipelineUseCase", () => {
    it("deleta pipeline não-padrão", async () => {
      const created = await create.execute({ name: "Para Deletar" });
      const id = created.isRight() ? created.value.pipeline.id.toString() : "";

      const result = await remove.execute(id);
      expect(result.isRight()).toBe(true);
      expect(repo.pipelines).toHaveLength(0);
    });

    it("retorna erro ao tentar deletar pipeline padrão", async () => {
      const created = await create.execute({ name: "Padrão", isDefault: true });
      const id = created.isRight() ? created.value.pipeline.id.toString() : "";

      const result = await remove.execute(id);
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.message).toContain("padrão");
      }
    });

    it("retorna erro quando pipeline não existe", async () => {
      const result = await remove.execute("nao-existe");
      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── SetDefaultPipelineUseCase ──────────────────────────────────────────

  describe("SetDefaultPipelineUseCase", () => {
    it("define pipeline como padrão e remove de outros", async () => {
      const a = await create.execute({ name: "A", isDefault: true });
      const b = await create.execute({ name: "B" });
      const idA = a.isRight() ? a.value.pipeline.id.toString() : "";
      const idB = b.isRight() ? b.value.pipeline.id.toString() : "";

      const result = await setDefault.execute(idB);
      expect(result.isRight()).toBe(true);

      const pA = repo.pipelines.find((p) => p.id.toString() === idA);
      const pB = repo.pipelines.find((p) => p.id.toString() === idB);
      expect(pA?.isDefault).toBe(false);
      expect(pB?.isDefault).toBe(true);
    });

    it("retorna erro quando pipeline não existe", async () => {
      const result = await setDefault.execute("nao-existe");
      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── Stage Use Cases ────────────────────────────────────────────────────

  describe("CreateStageUseCase", () => {
    it("cria estágio em pipeline existente", async () => {
      const pipeline = await create.execute({ name: "Pipeline" });
      const pipelineId = pipeline.isRight() ? pipeline.value.pipeline.id.toString() : "";

      const result = await createStage.execute({
        name: "Novo Estágio", order: 5, probability: 75, pipelineId,
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.stage.name).toBe("Novo Estágio");
        expect(result.value.stage.probability).toBe(75);
        expect(result.value.stage.pipelineId).toBe(pipelineId);
      }
    });

    it("retorna erro quando nome é vazio", async () => {
      const pipeline = await create.execute({ name: "Pipeline" });
      const pipelineId = pipeline.isRight() ? pipeline.value.pipeline.id.toString() : "";

      const result = await createStage.execute({ name: "", order: 1, probability: 10, pipelineId });
      expect(result.isLeft()).toBe(true);
    });

    it("retorna erro quando pipeline não existe", async () => {
      const result = await createStage.execute({ name: "Estágio", order: 1, probability: 10, pipelineId: "nao-existe" });
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.message).toContain("Pipeline não encontrado");
      }
    });
  });

  describe("UpdateStageUseCase", () => {
    it("atualiza nome e probabilidade do estágio", async () => {
      const pipeline = await create.execute({ name: "Pipeline" });
      const pipelineId = pipeline.isRight() ? pipeline.value.pipeline.id.toString() : "";
      const stage = repo.stages.find((s) => s.pipelineId === pipelineId)!;

      const result = await updateStage.execute({ id: stage.id.toString(), name: "Atualizado", probability: 50 });
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.stage.name).toBe("Atualizado");
        expect(result.value.stage.probability).toBe(50);
      }
    });

    it("retorna erro quando estágio não existe", async () => {
      const result = await updateStage.execute({ id: "nao-existe", name: "X" });
      expect(result.isLeft()).toBe(true);
    });
  });

  describe("DeleteStageUseCase", () => {
    it("deleta estágio sem deals", async () => {
      const pipeline = await create.execute({ name: "Pipeline" });
      const pipelineId = pipeline.isRight() ? pipeline.value.pipeline.id.toString() : "";
      const stage = repo.stages.find((s) => s.pipelineId === pipelineId)!;
      const stageId = stage.id.toString();

      const result = await deleteStage.execute(stageId);
      expect(result.isRight()).toBe(true);
      expect(repo.stages.find((s) => s.id.toString() === stageId)).toBeUndefined();
    });

    it("retorna erro quando estágio possui deals", async () => {
      const pipeline = await create.execute({ name: "Pipeline" });
      const pipelineId = pipeline.isRight() ? pipeline.value.pipeline.id.toString() : "";
      const stage = repo.stages.find((s) => s.pipelineId === pipelineId)!;
      const stageId = stage.id.toString();
      repo.dealCounts.set(stageId, 3);

      const result = await deleteStage.execute(stageId);
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.message).toContain("3 deal(s)");
      }
    });

    it("retorna erro quando estágio não existe", async () => {
      const result = await deleteStage.execute("nao-existe");
      expect(result.isLeft()).toBe(true);
    });
  });

  describe("ReorderStagesUseCase", () => {
    it("reordena estágios do pipeline", async () => {
      const pipeline = await create.execute({ name: "Pipeline" });
      const pipelineId = pipeline.isRight() ? pipeline.value.pipeline.id.toString() : "";
      const stagesBefore = repo.stages
        .filter((s) => s.pipelineId === pipelineId)
        .sort((a, b) => a.order - b.order);

      // Inverte a ordem
      const reversedIds = [...stagesBefore].reverse().map((s) => s.id.toString());
      const result = await reorderStages.execute({ pipelineId, stageIds: reversedIds });

      expect(result.isRight()).toBe(true);
      const lastId = reversedIds[0];
      const reordered = repo.stages.find((s) => s.id.toString() === lastId);
      expect(reordered?.order).toBe(1);
    });

    it("retorna erro quando pipeline não existe", async () => {
      const result = await reorderStages.execute({ pipelineId: "nao-existe", stageIds: ["s1"] });
      expect(result.isLeft()).toBe(true);
    });
  });
});
