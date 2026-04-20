import { Label } from "@/domain/labels/enterprise/entities/label";
import { LabelName } from "@/domain/labels/enterprise/value-objects/label-name.vo";
import { HexColor } from "@/domain/labels/enterprise/value-objects/hex-color.vo";
import { UniqueEntityID } from "@/core/unique-entity-id";
import type { Label as PrismaLabel } from "@prisma/client";

export class LabelMapper {
  static toDomain(raw: PrismaLabel): Label {
    return Label.create(
      {
        name: (LabelName.create(raw.name) as any).value as LabelName,
        color: (HexColor.create(raw.color) as any).value as HexColor,
        ownerId: raw.ownerId,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  static toPrisma(label: Label) {
    return {
      id: label.id.toString(),
      name: label.name,
      color: label.color,
      ownerId: label.ownerId,
      createdAt: label.createdAt,
      updatedAt: label.updatedAt,
    };
  }
}
