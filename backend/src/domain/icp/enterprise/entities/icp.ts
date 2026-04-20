import { Entity } from "@/core/entity";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { Either, left, right } from "@/core/either";
import { ICPStatus, ICPStatusValue } from "../value-objects/icp-status.vo";

export interface ICPProps {
  name: string;
  slug: string;
  content: string;
  status: ICPStatus;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateICPProps {
  name: string;
  slug: string;
  content: string;
  status?: ICPStatus;
  ownerId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ICPNameError extends Error { name = "ICPNameError"; }
export class ICPSlugError extends Error { name = "ICPSlugError"; }
export class ICPContentError extends Error { name = "ICPContentError"; }

export class ICP extends Entity<ICPProps> {
  get name(): string { return this.props.name; }
  get slug(): string { return this.props.slug; }
  get content(): string { return this.props.content; }
  get status(): ICPStatus { return this.props.status; }
  get statusValue(): ICPStatusValue { return this.props.status.value; }
  get ownerId(): string { return this.props.ownerId; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  static create(props: CreateICPProps, id?: UniqueEntityID): Either<Error, ICP> {
    const name = props.name.trim();
    if (!name) return left(new ICPNameError("Nome do ICP não pode ser vazio"));
    if (name.length > 100) return left(new ICPNameError("Nome do ICP não pode ter mais de 100 caracteres"));

    const slug = props.slug.trim();
    if (!slug) return left(new ICPSlugError("Slug do ICP não pode ser vazio"));
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return left(new ICPSlugError("Slug inválido"));

    const content = props.content.trim();
    if (!content) return left(new ICPContentError("Conteúdo do ICP não pode ser vazio"));

    const now = new Date();
    return right(new ICP({
      name,
      slug,
      content,
      status: props.status ?? ICPStatus.draft(),
      ownerId: props.ownerId,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    }, id));
  }

  update(data: { name?: string; slug?: string; content?: string; status?: string }): Either<Error, void> {
    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) return left(new ICPNameError("Nome não pode ser vazio"));
      if (name.length > 100) return left(new ICPNameError("Nome não pode ter mais de 100 caracteres"));
      this.props.name = name;
    }
    if (data.slug !== undefined) {
      const slug = data.slug.trim();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return left(new ICPSlugError("Slug inválido"));
      this.props.slug = slug;
    }
    if (data.content !== undefined) {
      const content = data.content.trim();
      if (!content) return left(new ICPContentError("Conteúdo não pode ser vazio"));
      this.props.content = content;
    }
    if (data.status !== undefined) {
      const statusResult = ICPStatus.create(data.status);
      if (statusResult.isLeft()) return left(statusResult.value);
      this.props.status = statusResult.value as ICPStatus;
    }
    this.props.updatedAt = new Date();
    return right(undefined);
  }

  static slugFromName(name: string): string {
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "");
  }
}
