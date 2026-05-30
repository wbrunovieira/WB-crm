import { describe, it, expect, beforeEach } from "vitest";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { GatekeeperAnalysis } from "@/domain/integrations/gatekeeper-analysis/enterprise/entities/gatekeeper-analysis.entity";
import { GatekeeperBatch } from "@/domain/integrations/gatekeeper-analysis/enterprise/entities/gatekeeper-batch.entity";
import { InMemoryGatekeeperAnalysisRepository } from "../../fakes/in-memory-gatekeeper-analysis.repository";
import { InMemoryGatekeeperBatchRepository } from "../../fakes/in-memory-gatekeeper-batch.repository";
import {
  GetGatekeeperAnalysesUseCase,
  GetGatekeeperAnalysisByActivityUseCase,
  GetGatekeeperAnalysisByIdUseCase,
  GetGatekeeperBatchesUseCase,
  GetGatekeeperBatchByIdUseCase,
  GatekeeperNotFoundError,
  GatekeeperForbiddenError,
} from "@/domain/integrations/gatekeeper-analysis/application/use-cases/query-gatekeeper.use-cases";

const OWNER = "owner-1";
const OTHER = "owner-2";

function analysis(id: string, ownerId = OWNER, activityId = `act-${id}`) {
  return GatekeeperAnalysis.create({ activityId, ownerId, status: "completed" }, new UniqueEntityID(id));
}
function batch(id: string, ownerId = OWNER) {
  return GatekeeperBatch.create({ ownerId, status: "completed" }, new UniqueEntityID(id));
}

describe("Gatekeeper query use cases", () => {
  let analysisRepo: InMemoryGatekeeperAnalysisRepository;
  let batchRepo: InMemoryGatekeeperBatchRepository;

  beforeEach(() => {
    analysisRepo = new InMemoryGatekeeperAnalysisRepository();
    batchRepo = new InMemoryGatekeeperBatchRepository();
  });

  describe("GetGatekeeperAnalysesUseCase", () => {
    it("retorna só as análises do owner", async () => {
      analysisRepo.items.push(analysis("a"), analysis("b", OTHER));
      const sut = new GetGatekeeperAnalysesUseCase(analysisRepo);
      const result = await sut.execute(OWNER);
      expect(result).toHaveLength(1);
      expect(result[0].id.toString()).toBe("a");
    });
  });

  describe("GetGatekeeperAnalysisByActivityUseCase", () => {
    let sut: GetGatekeeperAnalysisByActivityUseCase;
    beforeEach(() => { sut = new GetGatekeeperAnalysisByActivityUseCase(analysisRepo); });

    it("retorna a análise do dono", async () => {
      analysisRepo.items.push(analysis("a", OWNER, "act-x"));
      const r = await sut.execute({ activityId: "act-x", requesterId: OWNER, requesterRole: "sdr" });
      expect(r.isRight()).toBe(true);
    });
    it("404 quando não existe", async () => {
      const r = await sut.execute({ activityId: "nope", requesterId: OWNER, requesterRole: "sdr" });
      expect(r.isLeft()).toBe(true);
      if (r.isLeft()) expect(r.value).toBeInstanceOf(GatekeeperNotFoundError);
    });
    it("403 quando é de outro dono e não é admin", async () => {
      analysisRepo.items.push(analysis("a", OTHER, "act-x"));
      const r = await sut.execute({ activityId: "act-x", requesterId: OWNER, requesterRole: "sdr" });
      expect(r.isLeft()).toBe(true);
      if (r.isLeft()) expect(r.value).toBeInstanceOf(GatekeeperForbiddenError);
    });
    it("admin acessa de qualquer dono", async () => {
      analysisRepo.items.push(analysis("a", OTHER, "act-x"));
      const r = await sut.execute({ activityId: "act-x", requesterId: OWNER, requesterRole: "admin" });
      expect(r.isRight()).toBe(true);
    });
  });

  describe("GetGatekeeperAnalysisByIdUseCase", () => {
    let sut: GetGatekeeperAnalysisByIdUseCase;
    beforeEach(() => { sut = new GetGatekeeperAnalysisByIdUseCase(analysisRepo); });

    it("retorna por id para o dono", async () => {
      analysisRepo.items.push(analysis("a"));
      const r = await sut.execute({ id: "a", requesterId: OWNER, requesterRole: "sdr" });
      expect(r.isRight()).toBe(true);
    });
    it("404 quando não existe", async () => {
      const r = await sut.execute({ id: "nope", requesterId: OWNER, requesterRole: "sdr" });
      expect(r.isLeft()).toBe(true);
      if (r.isLeft()) expect(r.value).toBeInstanceOf(GatekeeperNotFoundError);
    });
    it("403 de outro dono", async () => {
      analysisRepo.items.push(analysis("a", OTHER));
      const r = await sut.execute({ id: "a", requesterId: OWNER, requesterRole: "sdr" });
      if (r.isLeft()) expect(r.value).toBeInstanceOf(GatekeeperForbiddenError);
      else throw new Error("esperava left");
    });
  });

  describe("GetGatekeeperBatchesUseCase", () => {
    it("retorna só os lotes do owner", async () => {
      batchRepo.items.push(batch("b1"), batch("b2", OTHER));
      const sut = new GetGatekeeperBatchesUseCase(batchRepo);
      const result = await sut.execute(OWNER);
      expect(result).toHaveLength(1);
      expect(result[0].id.toString()).toBe("b1");
    });
  });

  describe("GetGatekeeperBatchByIdUseCase", () => {
    let sut: GetGatekeeperBatchByIdUseCase;
    beforeEach(() => { sut = new GetGatekeeperBatchByIdUseCase(batchRepo); });

    it("retorna por id para o dono", async () => {
      batchRepo.items.push(batch("b1"));
      const r = await sut.execute({ id: "b1", requesterId: OWNER, requesterRole: "sdr" });
      expect(r.isRight()).toBe(true);
    });
    it("404 quando não existe", async () => {
      const r = await sut.execute({ id: "nope", requesterId: OWNER, requesterRole: "sdr" });
      if (r.isLeft()) expect(r.value).toBeInstanceOf(GatekeeperNotFoundError);
      else throw new Error("esperava left");
    });
    it("403 de outro dono", async () => {
      batchRepo.items.push(batch("b1", OTHER));
      const r = await sut.execute({ id: "b1", requesterId: OWNER, requesterRole: "sdr" });
      if (r.isLeft()) expect(r.value).toBeInstanceOf(GatekeeperForbiddenError);
      else throw new Error("esperava left");
    });
  });
});
