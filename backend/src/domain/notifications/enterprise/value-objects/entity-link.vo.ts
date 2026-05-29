import { Either, left, right } from "@/core/either";

export type LinkableEntityType = "lead" | "organization" | "contact" | "partner";

const ROUTE_SEGMENTS: Record<LinkableEntityType, string> = {
  lead: "leads",
  organization: "organizations",
  contact: "contacts",
  partner: "partners",
};

export class InvalidEntityLinkError extends Error {
  name = "InvalidEntityLinkError";
}

/**
 * Value Object — a navigation link to a CRM entity detail page, used as the
 * `link` field of a notification payload so the UI can route on click.
 *
 * Encapsulates the validation (non-empty id, supported type) and the route
 * format. Use cases must NOT build these paths inline — they only decide
 * which entity to link (orchestration) and delegate construction here.
 */
export class EntityLink {
  private constructor(public readonly value: string) {}

  static create(type: LinkableEntityType, id: string): Either<InvalidEntityLinkError, EntityLink> {
    const trimmed = id?.trim();
    if (!trimmed) {
      return left(new InvalidEntityLinkError("id da entidade é obrigatório"));
    }
    const segment = ROUTE_SEGMENTS[type];
    if (!segment) {
      return left(new InvalidEntityLinkError(`tipo de entidade não suportado: ${type}`));
    }
    return right(new EntityLink(`/${segment}/${trimmed}`));
  }

  /**
   * Returns the link for the first ref that has a valid (non-empty) id,
   * following the given priority order. Returns null when none qualify.
   */
  static firstOf(refs: Array<{ type: LinkableEntityType; id?: string | null }>): EntityLink | null {
    for (const ref of refs) {
      if (ref.id && ref.id.trim()) {
        const result = EntityLink.create(ref.type, ref.id);
        if (result.isRight()) return result.value;
      }
    }
    return null;
  }
}
