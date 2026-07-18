import { Entity } from "@/core/entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

interface Props {
  stepId: string;
  language: string;
  subject: string;
  bodyHtml: string;
}

export class EmailCampaignStepTranslation extends Entity<Props> {
  get stepId()   { return this.props.stepId; }
  get language() { return this.props.language; }
  get subject()  { return this.props.subject; }
  get bodyHtml() { return this.props.bodyHtml; }

  update(data: Partial<Pick<Props, "subject" | "bodyHtml">>) {
    if (data.subject !== undefined) this.props.subject = data.subject;
    if (data.bodyHtml !== undefined) this.props.bodyHtml = data.bodyHtml;
    return this;
  }

  static create(props: Props, id?: UniqueEntityID) {
    return new EmailCampaignStepTranslation(props, id);
  }

  static reconstitute(props: Props, id: UniqueEntityID) {
    return new EmailCampaignStepTranslation(props, id);
  }
}
