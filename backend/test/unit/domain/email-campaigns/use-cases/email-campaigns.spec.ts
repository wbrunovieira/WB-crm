import { describe, it, expect, beforeEach } from "vitest";
import { HandleGmailBounceUseCase } from "@/domain/email-campaigns/application/use-cases/handle-gmail-bounce.use-case";
import { InMemoryEmailCampaignsRepository } from "../fakes/in-memory-email-campaigns.repository";
import { InMemoryEmailCampaignStepsRepository } from "../fakes/in-memory-email-campaign-steps.repository";
import { InMemoryEmailCampaignRecipientsRepository } from "../fakes/in-memory-email-campaign-recipients.repository";
import { InMemoryEmailCampaignSendsRepository } from "../fakes/in-memory-email-campaign-sends.repository";
import { FakeGmailPortForCampaigns } from "../fakes/fake-gmail.port";
import { CreateEmailCampaignUseCase } from "@/domain/email-campaigns/application/use-cases/create-email-campaign.use-case";
import { AddCampaignStepUseCase } from "@/domain/email-campaigns/application/use-cases/add-campaign-step.use-case";
import { AddRecipientsUseCase } from "@/domain/email-campaigns/application/use-cases/add-recipients.use-case";
import { SendCampaignStepUseCase } from "@/domain/email-campaigns/application/use-cases/send-campaign-step.use-case";
import { GetCampaignStatsUseCase } from "@/domain/email-campaigns/application/use-cases/get-campaign-stats.use-case";
import { AddToSuppressionUseCase } from "@/domain/email-campaigns/application/use-cases/add-to-suppression.use-case";
import { UnsubscribeRecipientUseCase } from "@/domain/email-campaigns/application/use-cases/unsubscribe-recipient.use-case";
import { InMemoryEmailSuppressionsRepository } from "../fakes/in-memory-email-suppressions.repository";
import { VariableResolverService } from "@/domain/email-campaigns/application/services/variable-resolver.service";
import { EmailCampaignRecipient } from "@/domain/email-campaigns/enterprise/entities/email-campaign-recipient.entity";
import { EmailCampaignStep } from "@/domain/email-campaigns/enterprise/entities/email-campaign-step.entity";
import { EmailCampaignSend } from "@/domain/email-campaigns/enterprise/entities/email-campaign-send.entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

const OWNER = "owner-1";
const FROM = "bruno@wbdigitalsolutions.com";

describe("VariableResolverService", () => {
  const resolver = new VariableResolverService();

  it("should replace {{nome}} with recipient name", () => {
    const recipient = EmailCampaignRecipient.create({
      campaignId: "c1", recipientType: "LEAD", recipientId: "l1",
      email: "joao@empresa.com", name: "João Silva", company: "Acme", role: "CTO",
    });
    const result = resolver.resolve("Olá {{nome}}, da {{empresa}}!", recipient);
    expect(result).toBe("Olá João Silva, da Acme!");
  });

  it("should replace {{primeiro-nome}} with first name only", () => {
    const recipient = EmailCampaignRecipient.create({
      campaignId: "c1", recipientType: "LEAD", recipientId: "l1",
      email: "joao@empresa.com", name: "João Silva", company: "Acme",
    });
    const result = resolver.resolve("Oi {{primeiro-nome}}!", recipient);
    expect(result).toBe("Oi João!");
  });

  it("should replace custom variables", () => {
    const recipient = EmailCampaignRecipient.create({
      campaignId: "c1", recipientType: "LEAD", recipientId: "l1",
      email: "joao@empresa.com", name: "João", customVars: { produto: "CRM Pro" },
    });
    const result = resolver.resolve("Interesse em {{produto}}?", recipient);
    expect(result).toBe("Interesse em CRM Pro?");
  });

  it("should inject tracking pixel into HTML", () => {
    const html = "<p>Hello</p></body>";
    const result = resolver.injectTrackingPixel(html, "https://api.example.com", "send-1");
    expect(result).toContain('<img src="https://api.example.com/email-campaigns/tracking/open/send-1"');
    expect(result).toContain("</body>");
  });

  it("should rewrite links for click tracking", () => {
    const recipient = EmailCampaignRecipient.create({
      campaignId: "c1", recipientType: "LEAD", recipientId: "l1", email: "a@b.com",
    });
    const html = '<a href="https://google.com">clique</a>';
    const result = resolver.resolve(html, recipient, "https://api.example.com", "send-1");
    expect(result).toContain("/tracking/click/send-1");
    expect(result).toContain(encodeURIComponent("https://google.com"));
  });

  it("should inject unsubscribe link via {{link_descadastro}}", () => {
    const recipient = EmailCampaignRecipient.create({
      campaignId: "c1", recipientType: "LEAD", recipientId: "l1", email: "a@b.com",
    });
    const result = resolver.resolve(
      "Para descadastrar: {{link_descadastro}}",
      recipient,
      "https://api.example.com",
      "send-1",
    );
    expect(result).toContain("https://api.example.com/email-campaigns/tracking/unsubscribe/send-1");
  });

  it("should replace {{setor}} from customVars.setor", () => {
    const recipient = EmailCampaignRecipient.create({
      campaignId: "c1", recipientType: "LEAD", recipientId: "l1",
      email: "a@b.com", customVars: { setor: "tecnologia" },
    });
    const result = resolver.resolve("Empresas do setor de {{setor}}.", recipient);
    expect(result).toBe("Empresas do setor de tecnologia.");
  });

  it("should replace {{setor}} from customVars.segment as alias", () => {
    const recipient = EmailCampaignRecipient.create({
      campaignId: "c1", recipientType: "LEAD", recipientId: "l1",
      email: "a@b.com", customVars: { segment: "retalho" },
    });
    const result = resolver.resolve("Setor: {{setor}}", recipient);
    expect(result).toBe("Setor: retalho");
  });

  it("should replace {{segment}} from customVars.setor as alias", () => {
    const recipient = EmailCampaignRecipient.create({
      campaignId: "c1", recipientType: "LEAD", recipientId: "l1",
      email: "a@b.com", customVars: { setor: "saúde" },
    });
    const result = resolver.resolve("Segment: {{segment}}", recipient);
    expect(result).toBe("Segment: saúde");
  });

  it("should return empty string for {{setor}} when not set in customVars", () => {
    const recipient = EmailCampaignRecipient.create({
      campaignId: "c1", recipientType: "LEAD", recipientId: "l1",
      email: "a@b.com", name: "Ana",
    });
    const result = resolver.resolve("Olá {{nome}} {{setor}}.", recipient);
    expect(result).toBe("Olá Ana .");
  });
});

describe("CreateEmailCampaignUseCase", () => {
  let campaigns: InMemoryEmailCampaignsRepository;
  let sut: CreateEmailCampaignUseCase;

  beforeEach(() => {
    campaigns = new InMemoryEmailCampaignsRepository();
    sut = new CreateEmailCampaignUseCase(campaigns);
  });

  it("should create a campaign in DRAFT status", async () => {
    const result = await sut.execute({ name: "Campanha 1", fromEmail: FROM, ownerId: OWNER });
    expect(result.isRight()).toBe(true);
    expect(campaigns.items).toHaveLength(1);
    expect(campaigns.items[0].status).toBe("DRAFT");
    expect(campaigns.items[0].name).toBe("Campanha 1");
  });
});

describe("AddCampaignStepUseCase", () => {
  let campaigns: InMemoryEmailCampaignsRepository;
  let steps: InMemoryEmailCampaignStepsRepository;
  let sut: AddCampaignStepUseCase;

  beforeEach(() => {
    campaigns = new InMemoryEmailCampaignsRepository();
    steps = new InMemoryEmailCampaignStepsRepository();
    sut = new AddCampaignStepUseCase(campaigns, steps);
  });

  it("should add a step to an existing campaign", async () => {
    const createSut = new CreateEmailCampaignUseCase(campaigns);
    const created = await createSut.execute({ name: "C1", fromEmail: FROM, ownerId: OWNER });
    const campaignId = (created.value as { id: string }).id;

    const result = await sut.execute({
      campaignId, order: 1, subject: "Assunto {{nome}}", bodyHtml: "<p>Olá {{nome}}</p>", delayDays: 0,
    });
    expect(result.isRight()).toBe(true);
    expect(steps.items).toHaveLength(1);
    expect(steps.items[0].subject).toBe("Assunto {{nome}}");
  });

  it("should return error if campaign not found", async () => {
    const result = await sut.execute({ campaignId: "non-existent", order: 1, subject: "S", bodyHtml: "B", delayDays: 0 });
    expect(result.isLeft()).toBe(true);
  });
});

describe("AddRecipientsUseCase", () => {
  let campaigns: InMemoryEmailCampaignsRepository;
  let recipients: InMemoryEmailCampaignRecipientsRepository;
  let sut: AddRecipientsUseCase;

  beforeEach(() => {
    campaigns = new InMemoryEmailCampaignsRepository();
    recipients = new InMemoryEmailCampaignRecipientsRepository();
    sut = new AddRecipientsUseCase(campaigns, recipients);
  });

  it("should add recipients to campaign", async () => {
    const createSut = new CreateEmailCampaignUseCase(campaigns);
    const created = await createSut.execute({ name: "C1", fromEmail: FROM, ownerId: OWNER });
    const campaignId = (created.value as { id: string }).id;

    const result = await sut.execute({
      campaignId,
      recipients: [
        { recipientType: "LEAD", recipientId: "lead-1", email: "a@b.com", name: "Alice", company: "Acme" },
        { recipientType: "CONTACT", recipientId: "contact-1", email: "b@b.com", name: "Bob" },
      ],
    });

    expect(result.isRight()).toBe(true);
    expect(recipients.items).toHaveLength(2);
  });

  it("should not add duplicate recipient to same campaign", async () => {
    const createSut = new CreateEmailCampaignUseCase(campaigns);
    const created = await createSut.execute({ name: "C1", fromEmail: FROM, ownerId: OWNER });
    const campaignId = (created.value as { id: string }).id;

    await sut.execute({ campaignId, recipients: [{ recipientType: "LEAD", recipientId: "lead-1", email: "a@b.com" }] });
    await sut.execute({ campaignId, recipients: [{ recipientType: "LEAD", recipientId: "lead-1", email: "a@b.com" }] });

    expect(recipients.items).toHaveLength(1);
  });
});

describe("SendCampaignStepUseCase", () => {
  let campaigns: InMemoryEmailCampaignsRepository;
  let steps: InMemoryEmailCampaignStepsRepository;
  let recipients: InMemoryEmailCampaignRecipientsRepository;
  let sends: InMemoryEmailCampaignSendsRepository;
  let suppressions: InMemoryEmailSuppressionsRepository;
  let gmail: FakeGmailPortForCampaigns;
  let resolver: VariableResolverService;
  let sut: SendCampaignStepUseCase;

  beforeEach(() => {
    campaigns = new InMemoryEmailCampaignsRepository();
    steps = new InMemoryEmailCampaignStepsRepository();
    recipients = new InMemoryEmailCampaignRecipientsRepository();
    sends = new InMemoryEmailCampaignSendsRepository();
    suppressions = new InMemoryEmailSuppressionsRepository();
    gmail = new FakeGmailPortForCampaigns();
    resolver = new VariableResolverService();
    sut = new SendCampaignStepUseCase(campaigns, steps, recipients, sends, gmail, resolver, suppressions);
  });

  it("should send step 0 to all pending recipients with variable substitution", async () => {
    const createSut = new CreateEmailCampaignUseCase(campaigns);
    const created = await createSut.execute({ name: "C1", fromEmail: FROM, ownerId: OWNER });
    const campaignId = (created.value as { id: string }).id;

    const campaign = await campaigns.findById(campaignId);
    campaign!.start();
    await campaigns.save(campaign!);

    const step = EmailCampaignStep.create({ campaignId, order: 0, subject: "Oi {{nome}}", bodyHtml: "<p>Olá {{nome}} da {{empresa}}</p>", delayDays: 0 });
    await steps.save(step);

    const r1 = EmailCampaignRecipient.create({ campaignId, recipientType: "LEAD", recipientId: "l1", email: "alice@acme.com", name: "Alice", company: "Acme" });
    const r2 = EmailCampaignRecipient.create({ campaignId, recipientType: "LEAD", recipientId: "l2", email: "bob@corp.com", name: "Bob", company: "Corp" });
    await recipients.saveMany([r1, r2]);

    const result = await sut.execute({ campaignId, stepOrder: 0, delayRange: { min: 0, max: 0 } });
    expect(result.isRight()).toBe(true);
    expect(gmail.sentEmails).toHaveLength(2);
    expect(gmail.sentEmails[0].subject).toBe("Oi Alice");
    expect(gmail.sentEmails[1].subject).toBe("Oi Bob");
    expect(sends.items).toHaveLength(2);
  });

  it("should advance recipient step after sending (multi-step sequence)", async () => {
    const createSut = new CreateEmailCampaignUseCase(campaigns);
    const created = await createSut.execute({ name: "C1", fromEmail: FROM, ownerId: OWNER });
    const campaignId = (created.value as { id: string }).id;

    const campaign = await campaigns.findById(campaignId);
    campaign!.start();
    await campaigns.save(campaign!);

    // 2 steps — after step 0 the recipient should be ACTIVE waiting for step 1
    const step0 = EmailCampaignStep.create({ campaignId, order: 0, subject: "S0", bodyHtml: "B0", delayDays: 0 });
    const step1 = EmailCampaignStep.create({ campaignId, order: 1, subject: "S1", bodyHtml: "B1", delayDays: 3 });
    await steps.save(step0);
    await steps.save(step1);

    const r = EmailCampaignRecipient.create({ campaignId, recipientType: "LEAD", recipientId: "l1", email: "a@b.com", name: "Ana" });
    await recipients.save(r);

    await sut.execute({ campaignId, stepOrder: 0, delayRange: { min: 0, max: 0 } });

    const updated = recipients.items.find((rec) => rec.recipientId === "l1");
    expect(updated?.currentStep).toBe(1);
    expect(updated?.status).toBe("ACTIVE");
  });

  it("should not send to UNSUBSCRIBED or BOUNCED recipients", async () => {
    const createSut = new CreateEmailCampaignUseCase(campaigns);
    const created = await createSut.execute({ name: "C1", fromEmail: FROM, ownerId: OWNER });
    const campaignId = (created.value as { id: string }).id;

    const campaign = await campaigns.findById(campaignId);
    campaign!.start();
    await campaigns.save(campaign!);

    const step = EmailCampaignStep.create({ campaignId, order: 0, subject: "S", bodyHtml: "B", delayDays: 0 });
    await steps.save(step);

    const r = EmailCampaignRecipient.create({ campaignId, recipientType: "LEAD", recipientId: "l1", email: "a@b.com" });
    r.unsubscribe();
    await recipients.save(r);

    await sut.execute({ campaignId, stepOrder: 0, delayRange: { min: 0, max: 0 } });
    expect(gmail.sentEmails).toHaveLength(0);
  });

  it("should mark recipient as COMPLETED when all steps are sent", async () => {
    const createSut = new CreateEmailCampaignUseCase(campaigns);
    const created = await createSut.execute({ name: "C1", fromEmail: FROM, ownerId: OWNER });
    const campaignId = (created.value as { id: string }).id;

    const campaign = await campaigns.findById(campaignId);
    campaign!.start();
    await campaigns.save(campaign!);

    // Only 1 step total
    const step = EmailCampaignStep.create({ campaignId, order: 0, subject: "S", bodyHtml: "B", delayDays: 0 });
    await steps.save(step);

    const r = EmailCampaignRecipient.create({ campaignId, recipientType: "LEAD", recipientId: "l1", email: "a@b.com" });
    await recipients.save(r);

    await sut.execute({ campaignId, stepOrder: 0, delayRange: { min: 0, max: 0 } });

    const updated = recipients.items[0];
    expect(updated.status).toBe("COMPLETED");
  });
});

describe("GetCampaignStatsUseCase", () => {
  let campaigns: InMemoryEmailCampaignsRepository;
  let steps: InMemoryEmailCampaignStepsRepository;
  let recipients: InMemoryEmailCampaignRecipientsRepository;
  let sends: InMemoryEmailCampaignSendsRepository;
  let sut: GetCampaignStatsUseCase;

  beforeEach(() => {
    campaigns = new InMemoryEmailCampaignsRepository();
    steps = new InMemoryEmailCampaignStepsRepository();
    recipients = new InMemoryEmailCampaignRecipientsRepository();
    sends = new InMemoryEmailCampaignSendsRepository();
    sut = new GetCampaignStatsUseCase(campaigns, steps, recipients, sends);
  });

  it("should return stats with sent/opened/clicked counts per step", async () => {
    const createSut = new CreateEmailCampaignUseCase(campaigns);
    const created = await createSut.execute({ name: "C1", fromEmail: FROM, ownerId: OWNER });
    const campaignId = (created.value as { id: string }).id;

    const stepEntity = EmailCampaignStep.create({ campaignId, order: 0, subject: "S", bodyHtml: "B", delayDays: 0 });
    await steps.save(stepEntity);

    const r = EmailCampaignRecipient.create({ campaignId, recipientType: "LEAD", recipientId: "l1", email: "a@b.com" });
    await recipients.save(r);

    const send = EmailCampaignSend.create({ recipientId: r.id.toString(), stepId: stepEntity.id.toString() });
    send.markOpened();
    await sends.save(send);

    const result = await sut.execute({ campaignId });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.recipients.total).toBe(1);
      expect(result.value.steps[0].sent).toBe(1);
      expect(result.value.steps[0].opened).toBe(1);
      expect(result.value.steps[0].clicked).toBe(0);
    }
  });
});

describe("AddToSuppressionUseCase", () => {
  let suppressions: InMemoryEmailSuppressionsRepository;
  let sut: AddToSuppressionUseCase;

  beforeEach(() => {
    suppressions = new InMemoryEmailSuppressionsRepository();
    sut = new AddToSuppressionUseCase(suppressions);
  });

  it("should add email to suppression list", async () => {
    const result = await sut.execute({ email: "spam@example.com", ownerId: OWNER, reason: "manual" });
    expect(result.isRight()).toBe(true);
    expect(suppressions.items).toHaveLength(1);
    expect(suppressions.items[0].email).toBe("spam@example.com");
  });

  it("should not duplicate email in suppression list", async () => {
    await sut.execute({ email: "spam@example.com", ownerId: OWNER, reason: "manual" });
    await sut.execute({ email: "spam@example.com", ownerId: OWNER, reason: "manual" });
    expect(suppressions.items).toHaveLength(1);
  });
});

describe("UnsubscribeRecipientUseCase", () => {
  let campaigns: InMemoryEmailCampaignsRepository;
  let recipients: InMemoryEmailCampaignRecipientsRepository;
  let suppressions: InMemoryEmailSuppressionsRepository;
  let sends: InMemoryEmailCampaignSendsRepository;
  let sut: UnsubscribeRecipientUseCase;

  beforeEach(() => {
    campaigns = new InMemoryEmailCampaignsRepository();
    recipients = new InMemoryEmailCampaignRecipientsRepository();
    suppressions = new InMemoryEmailSuppressionsRepository();
    sends = new InMemoryEmailCampaignSendsRepository();
    sut = new UnsubscribeRecipientUseCase(recipients, suppressions, sends, campaigns);
  });

  it("should mark recipient as UNSUBSCRIBED and add to suppression list", async () => {
    const createCampaignSut = new CreateEmailCampaignUseCase(campaigns);
    const created = await createCampaignSut.execute({ name: "C1", fromEmail: FROM, ownerId: OWNER });
    const campaignId = (created.value as { id: string }).id;

    const r = EmailCampaignRecipient.create({
      campaignId, recipientType: "LEAD", recipientId: "l1",
      email: "user@example.com", name: "João",
    });
    await recipients.save(r);

    const step = EmailCampaignStep.create({ campaignId, order: 0, subject: "S", bodyHtml: "B", delayDays: 0 });
    const send = EmailCampaignSend.create({ recipientId: r.id.toString(), stepId: step.id.toString() });
    await sends.save(send);

    const result = await sut.execute({ sendId: send.id.toString() });
    expect(result.isRight()).toBe(true);

    const updated = recipients.items[0];
    expect(updated.status).toBe("UNSUBSCRIBED");
    expect(updated.unsubscribedAt).toBeDefined();

    expect(suppressions.items).toHaveLength(1);
    expect(suppressions.items[0].email).toBe("user@example.com");
    expect(suppressions.items[0].reason).toBe("unsubscribed");
  });
});

describe("SendCampaignStep — duplicate send guard", () => {
  it("should not send to recipient if send already exists for same step", async () => {
    const campaigns = new InMemoryEmailCampaignsRepository();
    const steps = new InMemoryEmailCampaignStepsRepository();
    const recipients = new InMemoryEmailCampaignRecipientsRepository();
    const sends = new InMemoryEmailCampaignSendsRepository();
    const suppressions = new InMemoryEmailSuppressionsRepository();
    const gmail = new FakeGmailPortForCampaigns();
    const resolver = new VariableResolverService();
    const sut = new SendCampaignStepUseCase(campaigns, steps, recipients, sends, gmail, resolver, suppressions);

    const created = await new CreateEmailCampaignUseCase(campaigns).execute({ name: "C1", fromEmail: FROM, ownerId: OWNER });
    const campaignId = (created.value as { id: string }).id;
    const campaign = await campaigns.findById(campaignId);
    campaign!.start();
    await campaigns.save(campaign!);

    const step = EmailCampaignStep.create({ campaignId, order: 0, subject: "S", bodyHtml: "B", delayDays: 0 });
    await steps.save(step);

    const r = EmailCampaignRecipient.create({ campaignId, recipientType: "LEAD", recipientId: "l1", email: "a@b.com" });
    await recipients.save(r);

    // First send
    await sut.execute({ campaignId, stepOrder: 0, delayRange: { min: 0, max: 0 } });
    expect(gmail.sentEmails).toHaveLength(1);

    // Reset recipient to PENDING/step 0 to simulate a re-trigger
    r.props.currentStep = 0;
    r.props.status = "PENDING";
    await recipients.save(r);

    // Second trigger — should be blocked by duplicate guard
    await sut.execute({ campaignId, stepOrder: 0, delayRange: { min: 0, max: 0 } });
    expect(gmail.sentEmails).toHaveLength(1); // still 1, not 2
  });
});

describe("SendCampaignStep — suppression check", () => {
  it("should not send to suppressed emails", async () => {
    const campaigns = new InMemoryEmailCampaignsRepository();
    const steps = new InMemoryEmailCampaignStepsRepository();
    const recipients = new InMemoryEmailCampaignRecipientsRepository();
    const sends = new InMemoryEmailCampaignSendsRepository();
    const suppressions = new InMemoryEmailSuppressionsRepository();
    const gmail = new FakeGmailPortForCampaigns();
    const resolver = new VariableResolverService();
    const sut = new SendCampaignStepUseCase(campaigns, steps, recipients, sends, gmail, resolver, suppressions);

    const createSut = new CreateEmailCampaignUseCase(campaigns);
    const created = await createSut.execute({ name: "C1", fromEmail: FROM, ownerId: OWNER });
    const campaignId = (created.value as { id: string }).id;

    const campaign = await campaigns.findById(campaignId);
    campaign!.start();
    await campaigns.save(campaign!);

    const step = EmailCampaignStep.create({ campaignId, order: 0, subject: "S", bodyHtml: "B", delayDays: 0 });
    await steps.save(step);

    const r = EmailCampaignRecipient.create({
      campaignId, recipientType: "LEAD", recipientId: "l1", email: "suppressed@example.com",
    });
    await recipients.save(r);

    // Add to suppression list
    suppressions.items.push({ email: "suppressed@example.com", ownerId: OWNER } as any);

    await sut.execute({ campaignId, stepOrder: 0, delayRange: { min: 0, max: 0 } });
    expect(gmail.sentEmails).toHaveLength(0);
  });
});

describe("EmailCampaignSend — markOpened", () => {
  it("should set openedAt on first call and start openCount at 1", () => {
    const send = EmailCampaignSend.create({ recipientId: "r1", stepId: "s1" });
    expect(send.openedAt).toBeUndefined();
    expect(send.openCount).toBe(0);

    send.markOpened();

    expect(send.openedAt).toBeDefined();
    expect(send.openCount).toBe(1);
  });

  it("should not overwrite openedAt but should increment openCount on repeat calls", () => {
    const send = EmailCampaignSend.create({ recipientId: "r1", stepId: "s1" });
    send.markOpened();
    const firstOpenedAt = send.openedAt;
    send.markOpened();
    send.markOpened();

    expect(send.openedAt).toBe(firstOpenedAt);
    expect(send.openCount).toBe(3);
  });

  it("should start with openCount 0 on create", () => {
    const send = EmailCampaignSend.create({ recipientId: "r1", stepId: "s1" });
    expect(send.openCount).toBe(0);
  });

  it("should reconstitute with existing openCount", () => {
    const send = EmailCampaignSend.reconstitute(
      { recipientId: "r1", stepId: "s1", sentAt: new Date(), openedAt: new Date(), openCount: 5 },
      new UniqueEntityID(),
    );
    expect(send.openCount).toBe(5);
  });
});

describe("EmailCampaignSend — markClicked", () => {
  it("should set clickedAt and openedAt on first click", () => {
    const send = EmailCampaignSend.create({ recipientId: "r1", stepId: "s1" });
    send.markClicked();
    expect(send.clickedAt).toBeDefined();
    expect(send.openedAt).toBeDefined();
  });

  it("should save clickedUrl on first click with URL", () => {
    const send = EmailCampaignSend.create({ recipientId: "r1", stepId: "s1" });
    send.markClicked("https://wbdigitalsolutions.com/case");
    expect(send.clickedUrl).toBe("https://wbdigitalsolutions.com/case");
  });

  it("should not overwrite clickedUrl on subsequent clicks but should count each URL", () => {
    const send = EmailCampaignSend.create({ recipientId: "r1", stepId: "s1" });
    send.markClicked("https://first.com");
    send.markClicked("https://second.com");
    expect(send.clickedUrl).toBe("https://first.com");
    expect(send.clickData["https://first.com"]).toBe(1);
    expect(send.clickData["https://second.com"]).toBe(1);
  });

  it("should increment count for same URL on multiple clicks", () => {
    const send = EmailCampaignSend.create({ recipientId: "r1", stepId: "s1" });
    send.markClicked("https://landing.com");
    send.markClicked("https://landing.com");
    send.markClicked("https://landing.com");
    expect(send.clickData["https://landing.com"]).toBe(3);
  });

  it("should not overwrite clickedAt on subsequent calls", () => {
    const send = EmailCampaignSend.create({ recipientId: "r1", stepId: "s1" });
    send.markClicked("https://a.com");
    const firstClickedAt = send.clickedAt;
    send.markClicked("https://b.com");
    expect(send.clickedAt).toBe(firstClickedAt);
  });

  it("should leave clickedUrl and clickData empty when called without URL", () => {
    const send = EmailCampaignSend.create({ recipientId: "r1", stepId: "s1" });
    send.markClicked();
    expect(send.clickedUrl).toBeUndefined();
    expect(Object.keys(send.clickData)).toHaveLength(0);
  });

  it("should start with empty clickData on create", () => {
    const send = EmailCampaignSend.create({ recipientId: "r1", stepId: "s1" });
    expect(send.clickData).toEqual({});
  });

  it("should reconstitute with existing clickedUrl and clickData", () => {
    const send = EmailCampaignSend.reconstitute(
      {
        recipientId: "r1", stepId: "s1", sentAt: new Date(),
        clickedAt: new Date(), clickedUrl: "https://landing.com",
        clickData: { "https://landing.com": 2, "https://pricing.com": 1 },
      },
      new UniqueEntityID(),
    );
    expect(send.clickedUrl).toBe("https://landing.com");
    expect(send.clickData["https://landing.com"]).toBe(2);
    expect(send.clickData["https://pricing.com"]).toBe(1);
  });
});

describe("HandleGmailBounceUseCase", () => {
  let campaigns: InMemoryEmailCampaignsRepository;
  let recipients: InMemoryEmailCampaignRecipientsRepository;
  let suppressions: InMemoryEmailSuppressionsRepository;
  let sut: HandleGmailBounceUseCase;
  let campaignId: string;

  beforeEach(async () => {
    campaigns = new InMemoryEmailCampaignsRepository();
    recipients = new InMemoryEmailCampaignRecipientsRepository();
    suppressions = new InMemoryEmailSuppressionsRepository();
    sut = new HandleGmailBounceUseCase(recipients, suppressions, campaigns);

    const created = await new CreateEmailCampaignUseCase(campaigns).execute({
      name: "Bounce Test Campaign", fromEmail: FROM, ownerId: OWNER,
    });
    campaignId = (created.value as { id: string }).id;
  });

  it("should mark recipient as BOUNCED", async () => {
    const recipient = EmailCampaignRecipient.create({
      campaignId, recipientType: "LEAD", recipientId: "l1", email: "bounce@example.com",
    });
    await recipients.save(recipient);

    const result = await sut.execute({ email: "bounce@example.com", ownerId: OWNER });

    expect(result.isRight()).toBe(true);
    expect(recipients.items[0].status).toBe("BOUNCED");
  });

  it("should add email to suppression list with reason 'bounced'", async () => {
    const recipient = EmailCampaignRecipient.create({
      campaignId, recipientType: "LEAD", recipientId: "l1", email: "bounce@example.com",
    });
    await recipients.save(recipient);

    await sut.execute({ email: "bounce@example.com", ownerId: OWNER });

    expect(suppressions.items).toHaveLength(1);
    expect(suppressions.items[0].email).toBe("bounce@example.com");
    expect(suppressions.items[0].reason).toBe("bounced");
  });

  it("should not duplicate suppression if email already suppressed", async () => {
    const recipient = EmailCampaignRecipient.create({
      campaignId, recipientType: "LEAD", recipientId: "l1", email: "bounce@example.com",
    });
    await recipients.save(recipient);

    await sut.execute({ email: "bounce@example.com", ownerId: OWNER });
    await sut.execute({ email: "bounce@example.com", ownerId: OWNER });

    expect(suppressions.items).toHaveLength(1);
  });

  it("should mark all recipients with the same email as BOUNCED across campaigns", async () => {
    const created2 = await new CreateEmailCampaignUseCase(campaigns).execute({
      name: "Campaign 2", fromEmail: FROM, ownerId: OWNER,
    });
    const campaignId2 = (created2.value as { id: string }).id;

    const r1 = EmailCampaignRecipient.create({ campaignId, recipientType: "LEAD", recipientId: "l1", email: "bounce@example.com" });
    const r2 = EmailCampaignRecipient.create({ campaignId: campaignId2, recipientType: "LEAD", recipientId: "l2", email: "bounce@example.com" });
    await recipients.save(r1);
    await recipients.save(r2);

    const result = await sut.execute({ email: "bounce@example.com", ownerId: OWNER });

    expect(result.isRight()).toBe(true);
    expect((result.value as { bouncedCount: number }).bouncedCount).toBe(2);
    expect(recipients.items.every((r) => r.status === "BOUNCED")).toBe(true);
  });

  it("should skip recipients already BOUNCED or UNSUBSCRIBED", async () => {
    const r1 = EmailCampaignRecipient.reconstitute(
      { campaignId, recipientType: "LEAD", recipientId: "l1", email: "bounce@example.com", currentStep: 0, status: "BOUNCED" },
      new UniqueEntityID(),
    );
    const r2 = EmailCampaignRecipient.reconstitute(
      { campaignId, recipientType: "LEAD", recipientId: "l2", email: "bounce@example.com", currentStep: 0, status: "UNSUBSCRIBED" },
      new UniqueEntityID(),
    );
    await recipients.save(r1);
    await recipients.save(r2);

    const result = await sut.execute({ email: "bounce@example.com", ownerId: OWNER });

    expect(result.isRight()).toBe(true);
    expect((result.value as { bouncedCount: number }).bouncedCount).toBe(0);
  });

  it("should still add to suppression even when no active recipients found", async () => {
    const result = await sut.execute({ email: "ghost@example.com", ownerId: OWNER });

    expect(result.isRight()).toBe(true);
    expect(suppressions.items).toHaveLength(1);
    expect(suppressions.items[0].reason).toBe("bounced");
  });

  it("should mark COMPLETED recipient as BOUNCED (NDR arrives after all steps sent)", async () => {
    const r = EmailCampaignRecipient.reconstitute(
      { campaignId, recipientType: "LEAD", recipientId: "l1", email: "bounce@example.com", currentStep: 1, status: "COMPLETED" },
      new UniqueEntityID(),
    );
    await recipients.save(r);

    const result = await sut.execute({ email: "bounce@example.com", ownerId: OWNER });

    expect(result.isRight()).toBe(true);
    expect((result.value as { bouncedCount: number }).bouncedCount).toBe(1);
    expect(recipients.items[0].status).toBe("BOUNCED");
  });

  it("should not mark BOUNCED or UNSUBSCRIBED recipients again", async () => {
    const r1 = EmailCampaignRecipient.reconstitute(
      { campaignId, recipientType: "LEAD", recipientId: "l1", email: "x@example.com", currentStep: 0, status: "BOUNCED" },
      new UniqueEntityID(),
    );
    const r2 = EmailCampaignRecipient.reconstitute(
      { campaignId, recipientType: "LEAD", recipientId: "l2", email: "x@example.com", currentStep: 0, status: "UNSUBSCRIBED" },
      new UniqueEntityID(),
    );
    await recipients.save(r1);
    await recipients.save(r2);

    const result = await sut.execute({ email: "x@example.com", ownerId: OWNER });

    expect((result.value as { bouncedCount: number }).bouncedCount).toBe(0);
    expect(recipients.items[0].status).toBe("BOUNCED");
    expect(recipients.items[1].status).toBe("UNSUBSCRIBED");
  });
});
