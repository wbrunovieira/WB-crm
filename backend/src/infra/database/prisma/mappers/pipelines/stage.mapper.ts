import type { Stage as PrismaStage } from "@prisma/client";
import { Stage } from "@/domain/pipelines/enterprise/entities/stage";
import { UniqueEntityID } from "@/core/unique-entity-id";

export class StageMapper {
  static toDomain(raw: PrismaStage): Stage {
    return Stage.create(
      {
        name: raw.name,
        order: raw.order,
        pipelineId: raw.pipelineId,
        probability: raw.probability,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  static toPrisma(stage: Stage): PrismaStage {
    return {
      id: stage.id.toString(),
      name: stage.name,
      order: stage.order,
      pipelineId: stage.pipelineId,
      probability: stage.probability,
      createdAt: stage.createdAt,
      updatedAt: stage.updatedAt,
    };
  }
}
