import type { Pipeline as PrismaPipeline } from "@prisma/client";
import { Pipeline } from "@/domain/pipelines/enterprise/entities/pipeline";
import { UniqueEntityID } from "@/core/unique-entity-id";

export class PipelineMapper {
  static toDomain(raw: PrismaPipeline): Pipeline {
    return Pipeline.create(
      {
        name: raw.name,
        isDefault: raw.isDefault,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  static toPrisma(pipeline: Pipeline): PrismaPipeline {
    return {
      id: pipeline.id.toString(),
      name: pipeline.name,
      isDefault: pipeline.isDefault,
      createdAt: pipeline.createdAt,
      updatedAt: pipeline.updatedAt,
    };
  }
}
