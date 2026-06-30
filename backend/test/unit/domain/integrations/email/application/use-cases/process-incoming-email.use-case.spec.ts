import { describe, it, expect, beforeEach } from "vitest";
import { ProcessIncomingEmailUseCase } from "@/domain/integrations/email/application/use-cases/process-incoming-email.use-case";
import { FakeEmailMessagesRepository } from "../../fakes/fake-email-messages.repository";
import { FakeActivitiesRepository } from "@test/unit/domain/integrations/whatsapp/fakes/fake-activities.repository";
import type { GmailMessage } from "@/domain/integrations/email/application/ports/gmail.port";
import { Activity } from "@/domain/activities/enterprise/entities/activity";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { right } from "@/core/either";

const OWNER_ID = "owner-001";

function makeMessage(overrides: Partial<GmailMessage> = {}): GmailMessage {
  return {
    messageId: "gmail-msg-001",
    threadId: "thread-001",
    from: "sender@example.com",
    to: "me@mycompany.com",
    subject: "Proposta comercial",
    bodyText: "Olá, segue nossa proposta...",
    bodyHtml: "<p>Olá, segue nossa proposta...</p>",
    receivedAt: new Date("2024-01-15T10:00:00Z"),
    ...overrides,
  };
}

// ── Lightweight fakes (implement only what the use case calls) ─────────────────

class FakeContacts {
  map: Record<string, string> = {}; // `${owner}|${email}` -> contactId
  error: Error | null = null;
  async findIdByEmailForOwner(email: string, owner: string): Promise<string | null> {
    if (this.error) throw this.error;
    return this.map[`${owner}|${email.toLowerCase()}`] ?? null;
  }
}
class FakeLeadContacts {
  map: Record<string, string> = {}; // `${owner}|${email}` -> leadId
  async findLeadIdByContactEmailForOwner(email: string, owner: string): Promise<string | null> {
    return this.map[`${owner}|${email.toLowerCase()}`] ?? null;
  }
}
class FakeOrganizations {
  map: Record<string, string> = {};
  async findIdByEmailForOwner(email: string, owner: string): Promise<string | null> {
    return this.map[`${owner}|${email.toLowerCase()}`] ?? null;
  }
}
class FakeCampaigns {
  byOwner: Record<string, string[]> = {};
  async findAllByOwner(owner: string) {
    return (this.byOwner[owner] ?? []).map((id) => ({ id: { toString: () => id } }));
  }
}
interface RecipientStub { id: { toString: () => string }; campaignId: string; email: string; status: string; markBounced: () => void; markDelayed: () => void; }
function makeRecipient(id: string, campaignId: string, email: string, status = "ACTIVE"): RecipientStub {
  return {
    id: { toString: () => id },
    campaignId,
    email,
    status,
    markBounced() { this.status = "BOUNCED"; },
    markDelayed() { this.status = "DELAYED"; },
  };
}
class FakeRecipients {
  items: RecipientStub[] = [];
  saved: RecipientStub[] = [];
  async findByEmail(email: string) { return this.items.filter((r) => r.email.toLowerCase() === email.toLowerCase()); }
  async save(r: RecipientStub) { this.saved.push(r); }
}
class FakeSends {
  byRecipient: Record<string, string[]> = {}; // recipientId -> sendIds
  async findByRecipient(recipientId: string) {
    return (this.byRecipient[recipientId] ?? []).map((id) => ({ id: { toString: () => id } }));
  }
}
class FakeSuppressions {
  suppressed = new Set<string>();
  saved: Array<{ email: string; ownerId: string; reason: string }> = [];
  async isEmailSuppressed(email: string, owner: string) { return this.suppressed.has(`${owner}|${email.toLowerCase()}`); }
  async save(s: { email: string; ownerId: string; reason: string }) {
    this.saved.push({ email: s.email, ownerId: s.ownerId, reason: s.reason });
    this.suppressed.add(`${s.ownerId}|${s.email.toLowerCase()}`);
  }
}
class FakeCreateNotification {
  calls: Array<{ type: string; title: string; summary: string; userId: string; payload?: string }> = [];
  async execute(input: { type: string; title: string; summary: string; userId: string; payload?: string }) {
    this.calls.push(input);
    return right({ id: { toString: () => "notif-1" } });
  }
}

// ── Wiring ─────────────────────────────────────────────────────────────────────

let emailMessagesRepo: FakeEmailMessagesRepository;
let activitiesRepo: FakeActivitiesRepository;
let contacts: FakeContacts;
let leadContacts: FakeLeadContacts;
let organizations: FakeOrganizations;
let campaigns: FakeCampaigns;
let recipients: FakeRecipients;
let sends: FakeSends;
let suppressions: FakeSuppressions;
let createNotification: FakeCreateNotification;
let useCase: ProcessIncomingEmailUseCase;

beforeEach(() => {
  emailMessagesRepo = new FakeEmailMessagesRepository();
  activitiesRepo = new FakeActivitiesRepository();
  contacts = new FakeContacts();
  leadContacts = new FakeLeadContacts();
  organizations = new FakeOrganizations();
  campaigns = new FakeCampaigns();
  recipients = new FakeRecipients();
  sends = new FakeSends();
  suppressions = new FakeSuppressions();
  createNotification = new FakeCreateNotification();

  useCase = new ProcessIncomingEmailUseCase(
    emailMessagesRepo,
    activitiesRepo,
    contacts as never,
    leadContacts as never,
    organizations as never,
    campaigns as never,
    recipients as never,
    sends as never,
    suppressions as never,
    createNotification as never,
  );
});

// ── Tests: matching + activity + notification ──────────────────────────────────

describe("ProcessIncomingEmailUseCase", () => {
  it("creates an activity and saves email message on first processing", async () => {
    contacts.map[`${OWNER_ID}|sender@example.com`] = "contact-default";
    const result = await useCase.execute(makeMessage(), OWNER_ID);

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().skipped).toBe(false);
    expect(result.unwrap().activityId).toBeDefined();

    expect(activitiesRepo.items).toHaveLength(1);
    const activity = activitiesRepo.items[0];
    expect(activity.type).toBe("email");
    expect(activity.subject).toContain("Proposta comercial");
    expect(activity.ownerId).toBe(OWNER_ID);
    expect(activity.completed).toBe(true);

    expect(emailMessagesRepo.items).toHaveLength(1);
    expect(emailMessagesRepo.items[0].gmailMessageId).toBe("gmail-msg-001");
  });

  it("returns skipped=true for duplicate messageId (idempotency)", async () => {
    contacts.map[`${OWNER_ID}|sender@example.com`] = "contact-default";
    const message = makeMessage();

    await useCase.execute(message, OWNER_ID);
    expect(emailMessagesRepo.items).toHaveLength(1);

    const result = await useCase.execute(message, OWNER_ID);
    expect(result.isRight()).toBe(true);
    expect(result.unwrap().skipped).toBe(true);

    expect(emailMessagesRepo.items).toHaveLength(1);
    expect(activitiesRepo.items).toHaveLength(1);
  });

  it("links activity to contact when contact email matches", async () => {
    contacts.map[`${OWNER_ID}|contact@example.com`] = "contact-abc";
    const result = await useCase.execute(makeMessage({ from: "contact@example.com" }), OWNER_ID);

    expect(result.isRight()).toBe(true);
    const activity = activitiesRepo.items[0];
    expect(activity.contactId).toBe("contact-abc");
    expect(activity.leadId).toBeUndefined();
  });

  it("links activity to lead when no contact found but leadContact matches", async () => {
    leadContacts.map[`${OWNER_ID}|lead-contact@example.com`] = "lead-xyz";
    const result = await useCase.execute(makeMessage({ from: "lead-contact@example.com" }), OWNER_ID);

    expect(result.isRight()).toBe(true);
    const activity = activitiesRepo.items[0];
    expect(activity.leadId).toBe("lead-xyz");
    expect(activity.contactId).toBeUndefined();
  });

  it("links activity to organization when org email matches and no contact/lead found", async () => {
    organizations.map[`${OWNER_ID}|contact@organization.com`] = "org-999";
    const result = await useCase.execute(makeMessage({ from: "contact@organization.com" }), OWNER_ID);

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().skipped).toBe(false);
    const activity = activitiesRepo.items[0];
    expect(activity.organizationId).toBe("org-999");
    expect(activity.contactId).toBeUndefined();
    expect(activity.leadId).toBeUndefined();
  });

  it("skips processing when sender matches no contact, lead contact, or organization", async () => {
    const result = await useCase.execute(makeMessage({ from: "unknown@nowhere.com" }), OWNER_ID);

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().skipped).toBe(true);
    expect(activitiesRepo.items).toHaveLength(0);
    expect(emailMessagesRepo.items).toHaveLength(0);
  });

  it("parses 'Name <email>' format correctly", async () => {
    contacts.map[`${OWNER_ID}|john@example.com`] = "contact-john";
    await useCase.execute(makeMessage({ from: "John Doe <john@example.com>" }), OWNER_ID);

    expect(activitiesRepo.items[0].contactId).toBe("contact-john");
  });

  it("stores emailMessageId and emailThreadId on the activity", async () => {
    contacts.map[`${OWNER_ID}|sender@example.com`] = "c1";
    await useCase.execute(makeMessage({ messageId: "gmail-unique-123", threadId: "thread-abc" }), OWNER_ID);

    const activity = activitiesRepo.items[0];
    expect(activity.emailMessageId).toBe("gmail-unique-123");
    expect(activity.emailThreadId).toBe("thread-abc");
  });

  it("returns left on infrastructure failure", async () => {
    contacts.error = new Error("DB connection failed");
    const result = await useCase.execute(makeMessage(), OWNER_ID);

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("DB connection failed");
  });

  it("handles message with empty subject gracefully", async () => {
    contacts.map[`${OWNER_ID}|sender@example.com`] = "c1";
    const result = await useCase.execute(makeMessage({ subject: "" }), OWNER_ID);

    expect(result.isRight()).toBe(true);
    expect(activitiesRepo.items[0].subject).toContain("(sem assunto)");
  });

  it("creates an EMAIL_RECEIVED notification when a contact matches", async () => {
    contacts.map[`${OWNER_ID}|sender@example.com`] = "c1";
    await useCase.execute(makeMessage({ subject: "Proposta comercial" }), OWNER_ID);

    expect(createNotification.calls).toHaveLength(1);
    const notif = createNotification.calls[0];
    expect(notif.type).toBe("EMAIL_RECEIVED");
    expect(notif.userId).toBe(OWNER_ID);
    expect(notif.title).toContain("Proposta comercial");
  });

  it("includes receivedToEmail and a contact link in the notification payload", async () => {
    contacts.map[`${OWNER_ID}|sender@example.com`] = "c-77";
    await useCase.execute(makeMessage({ to: "bruno@saltoup.com" }), OWNER_ID);

    const payload = JSON.parse(createNotification.calls[0].payload as string);
    expect(payload.receivedToEmail).toBe("bruno@saltoup.com");
    expect(payload.link).toBe("/contacts/c-77");
  });

  it("links the notification to the lead page when a lead matched", async () => {
    leadContacts.map[`${OWNER_ID}|lc@example.com`] = "lead-9";
    await useCase.execute(makeMessage({ from: "lc@example.com" }), OWNER_ID);
    expect(JSON.parse(createNotification.calls[0].payload as string).link).toBe("/leads/lead-9");
  });

  it("does NOT create a notification when the sender is unknown (skipped)", async () => {
    await useCase.execute(makeMessage({ from: "unknown@nowhere.com" }), OWNER_ID);
    expect(createNotification.calls).toHaveLength(0);
  });
});

// ── Tests: bounce detection ─────────────────────────────────────────────────────

describe("ProcessIncomingEmailUseCase — bounce detection", () => {
  it("marks the owner's recipients as BOUNCED and suppresses the email", async () => {
    campaigns.byOwner[OWNER_ID] = ["camp-1"];
    const r = makeRecipient("rec-1", "camp-1", "bounce@example.com", "ACTIVE");
    recipients.items.push(r);

    const result = await useCase.execute(makeMessage({
      from: "mailer-daemon@googlemail.com",
      subject: "Delivery Status Notification (Failure)",
      bodyText: "Final-Recipient: rfc822; bounce@example.com\nStatus: 5.1.1",
    }), OWNER_ID);

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().bounced).toBe(true);
    expect(r.status).toBe("BOUNCED");
    expect(recipients.saved).toContain(r);
    expect(suppressions.saved).toEqual([expect.objectContaining({ email: "bounce@example.com", reason: "bounced" })]);
  });

  it("does not re-suppress an already-suppressed email", async () => {
    campaigns.byOwner[OWNER_ID] = ["camp-1"];
    suppressions.suppressed.add(`${OWNER_ID}|already@suppressed.com`);

    await useCase.execute(makeMessage({
      from: "mailer-daemon@googlemail.com",
      bodyText: "Final-Recipient: rfc822; already@suppressed.com",
    }), OWNER_ID);

    expect(suppressions.saved).toHaveLength(0);
  });

  it("does not mark a recipient that is already BOUNCED/UNSUBSCRIBED", async () => {
    campaigns.byOwner[OWNER_ID] = ["camp-1"];
    const r = makeRecipient("rec-1", "camp-1", "x@y.com", "UNSUBSCRIBED");
    recipients.items.push(r);

    await useCase.execute(makeMessage({
      from: "mailer-daemon@googlemail.com",
      bodyText: "Final-Recipient: rfc822; x@y.com",
    }), OWNER_ID);

    expect(r.status).toBe("UNSUBSCRIBED");
    expect(recipients.saved).toHaveLength(0);
  });

  it("ignores recipients belonging to other owners' campaigns", async () => {
    campaigns.byOwner[OWNER_ID] = ["camp-mine"];
    const mine = makeRecipient("r-mine", "camp-mine", "shared@x.com", "ACTIVE");
    const theirs = makeRecipient("r-theirs", "camp-theirs", "shared@x.com", "ACTIVE");
    recipients.items.push(mine, theirs);

    await useCase.execute(makeMessage({
      from: "mailer-daemon@googlemail.com",
      bodyText: "Final-Recipient: rfc822; shared@x.com",
    }), OWNER_ID);

    expect(mine.status).toBe("BOUNCED");
    expect(theirs.status).toBe("ACTIVE"); // other owner's recipient untouched
  });

  it("marks a transient 'problema temporário' SERVFAIL as DELAYED, not bounced/suppressed", async () => {
    campaigns.byOwner[OWNER_ID] = ["camp-1"];
    const r = makeRecipient("rec-1", "camp-1", "neumannmkt@temtudopetropolis.com.br", "ACTIVE");
    recipients.items.push(r);

    const result = await useCase.execute(makeMessage({
      from: "Mail Delivery Subsystem <mailer-daemon@googlemail.com>",
      subject: "Entrega incompleta",
      bodyText:
        "Ocorreu um problema temporário na entrega da mensagem para neumannmkt@temtudopetropolis.com.br. " +
        "DNS Error: DNS type 'mx' lookup of temtudopetropolis.com.br responded with code SERVFAIL",
    }), OWNER_ID);

    // Temporary delay — surfaced as DELAYED, never suppressed (may still deliver)
    expect(result.unwrap().delayed).toBe(true);
    expect(result.unwrap().bounced).toBeUndefined();
    expect(r.status).toBe("DELAYED");
    expect(suppressions.saved).toHaveLength(0);
  });

  it("returns skipped=true when bounce body has no extractable email", async () => {
    const result = await useCase.execute(makeMessage({
      from: "mailer-daemon@googlemail.com",
      bodyText: "Something went wrong but no address here.",
    }), OWNER_ID);

    expect(result.unwrap().skipped).toBe(true);
    expect(suppressions.saved).toHaveLength(0);
  });

  it("does not treat a normal email from a known contact as a bounce", async () => {
    contacts.map[`${OWNER_ID}|normal@contact.com`] = "c1";
    const result = await useCase.execute(makeMessage({ from: "normal@contact.com" }), OWNER_ID);

    expect(result.unwrap().bounced).toBeUndefined();
    expect(recipients.saved).toHaveLength(0);
  });

  it("does not flip a SUPPRESSED recipient to BOUNCED on a permanent bounce", async () => {
    campaigns.byOwner[OWNER_ID] = ["camp-1"];
    const r = makeRecipient("rec-1", "camp-1", "supp@x.com", "SUPPRESSED");
    recipients.items.push(r);

    await useCase.execute(makeMessage({
      from: "mailer-daemon@googlemail.com",
      subject: "Delivery Status Notification (Failure)",
      bodyText: "Final-Recipient: rfc822; supp@x.com\nStatus: 5.1.1",
    }), OWNER_ID);

    // Never sent (suppression skip) — must stay SUPPRESSED, not re-counted as a bounce
    expect(r.status).toBe("SUPPRESSED");
    expect(recipients.saved).toHaveLength(0);
  });
});

// ── Tests: transient delay (Correction B) ──────────────────────────────────────

describe("ProcessIncomingEmailUseCase — transient delay", () => {
  it("marks recipients DELAYED (not bounced/suppressed) for a Gmail '(Delay)' NDR", async () => {
    campaigns.byOwner[OWNER_ID] = ["camp-1"];
    const r = makeRecipient("rec-1", "camp-1", "slow@x.com", "ACTIVE");
    recipients.items.push(r);

    const result = await useCase.execute(makeMessage({
      from: "Mail Delivery Subsystem <mailer-daemon@googlemail.com>",
      subject: "Delivery Status Notification (Delay)",
      bodyText: "wasn't delivered to slow@x.com. The server will retry. Action: delayed\nStatus: 4.4.1",
    }), OWNER_ID);

    expect(result.unwrap().delayed).toBe(true);
    expect(result.unwrap().bounced).toBeUndefined();
    expect(r.status).toBe("DELAYED");
    expect(suppressions.saved).toHaveLength(0);
  });

  it("treats 'tentará novamente' PT-BR body as a delay", async () => {
    campaigns.byOwner[OWNER_ID] = ["camp-1"];
    const r = makeRecipient("rec-1", "camp-1", "x@y.com", "ACTIVE");
    recipients.items.push(r);

    const result = await useCase.execute(makeMessage({
      from: "mailer-daemon@googlemail.com",
      subject: "Aviso de atraso",
      bodyText: "A entrega da mensagem para x@y.com está atrasada; o servidor tentará novamente nas próximas 24 horas.",
    }), OWNER_ID);

    expect(result.unwrap().delayed).toBe(true);
    expect(r.status).toBe("DELAYED");
    expect(suppressions.saved).toHaveLength(0);
  });

  it("does NOT fail the linked campaign_email activity on a delay", async () => {
    campaigns.byOwner[OWNER_ID] = ["camp-1"];
    const r = makeRecipient("rec-1", "camp-1", "slow@x.com", "ACTIVE");
    recipients.items.push(r);
    sends.byRecipient["rec-1"] = ["send-1"];
    const activity = Activity.create({
      ownerId: OWNER_ID, type: "campaign_email", subject: "S", completed: true,
      meetingNoShow: false, emailReplied: false, emailOpenCount: 0, emailLinkClickCount: 0,
      emailCampaignSendId: "send-1", emailCampaignId: "camp-1",
    }, new UniqueEntityID("act-send-1"));
    activitiesRepo.items.push(activity);

    await useCase.execute(makeMessage({
      from: "mailer-daemon@googlemail.com",
      subject: "Delivery Status Notification (Delay)",
      bodyText: "problema temporário na entrega da mensagem para slow@x.com",
    }), OWNER_ID);

    expect(activity.failedAt).toBeUndefined();
    expect(activity.completed).toBe(true);
  });

  it("still suppresses a definitive Failure even if a delay was seen earlier (DELAYED → BOUNCED)", async () => {
    campaigns.byOwner[OWNER_ID] = ["camp-1"];
    const r = makeRecipient("rec-1", "camp-1", "dead@x.com", "DELAYED");
    recipients.items.push(r);

    const result = await useCase.execute(makeMessage({
      from: "mailer-daemon@googlemail.com",
      subject: "Delivery Status Notification (Failure)",
      bodyText: "wasn't delivered to dead@x.com. Status: 5.4.1",
    }), OWNER_ID);

    expect(result.unwrap().bounced).toBe(true);
    expect(r.status).toBe("BOUNCED");
    expect(suppressions.saved).toEqual([expect.objectContaining({ email: "dead@x.com", reason: "bounced" })]);
  });
});

// ── Tests: bounce fails the linked campaign_email activity ──────────────────────

describe("ProcessIncomingEmailUseCase — bounce fails linked activity", () => {
  function makeCampaignActivity(sendId: string): Activity {
    return Activity.create(
      {
        ownerId: OWNER_ID,
        type: "campaign_email",
        subject: "Campanha X",
        completed: true,
        completedAt: new Date("2024-01-10T08:00:00Z"),
        meetingNoShow: false,
        emailReplied: false,
        emailOpenCount: 0,
        emailLinkClickCount: 0,
        emailCampaignSendId: sendId,
        emailCampaignId: "camp-1",
      },
      new UniqueEntityID(),
    );
  }

  beforeEach(() => {
    campaigns.byOwner[OWNER_ID] = ["camp-1"];
  });

  it("marks the linked campaign_email activity as failed on bounce", async () => {
    const r = makeRecipient("rec-1", "camp-1", "bounced@example.com", "ACTIVE");
    recipients.items.push(r);
    sends.byRecipient["rec-1"] = ["send-abc"];
    activitiesRepo.items.push(makeCampaignActivity("send-abc"));

    await useCase.execute(makeMessage({
      from: "mailer-daemon@googlemail.com",
      bodyText: "Final-Recipient: rfc822; bounced@example.com",
    }), OWNER_ID);

    const updated = activitiesRepo.items.find((a) => a.emailCampaignSendId === "send-abc")!;
    expect(updated.failedAt).toBeDefined();
    expect(updated.failReason).toBe("Email retornou (bounce)");
    expect(updated.completed).toBe(false);
  });

  it("does not double-fail an activity already marked failed", async () => {
    const r = makeRecipient("rec-1", "camp-1", "bounced@example.com", "ACTIVE");
    recipients.items.push(r);
    sends.byRecipient["rec-1"] = ["send-x"];
    const activity = makeCampaignActivity("send-x");
    activity.fail("Erro anterior");
    const originalFailedAt = activity.failedAt!;
    activitiesRepo.items.push(activity);

    await new Promise((res) => setTimeout(res, 5));

    await useCase.execute(makeMessage({
      from: "mailer-daemon@googlemail.com",
      bodyText: "Final-Recipient: rfc822; bounced@example.com",
    }), OWNER_ID);

    const after = activitiesRepo.items.find((a) => a.emailCampaignSendId === "send-x")!;
    expect(after.failedAt!.getTime()).toBe(originalFailedAt.getTime());
  });

  it("does nothing to activities when no send is linked to the bounced recipient", async () => {
    const r = makeRecipient("rec-1", "camp-1", "bounced@example.com", "ACTIVE");
    recipients.items.push(r);
    // no sends.byRecipient entry
    const activity = makeCampaignActivity("unrelated");
    activitiesRepo.items.push(activity);

    await useCase.execute(makeMessage({
      from: "mailer-daemon@googlemail.com",
      bodyText: "Final-Recipient: rfc822; bounced@example.com",
    }), OWNER_ID);

    expect(activitiesRepo.items[0].failedAt).toBeUndefined();
    expect(activitiesRepo.items[0].completed).toBe(true);
  });
});

// ── Tests: bounce fails the 1:1 (non-campaign) outbound email activity ───────────

describe("ProcessIncomingEmailUseCase — bounce fails 1:1 outbound activity", () => {
  function makeOutboundActivity(threadId: string, links: Partial<{ leadId: string; contactId: string; organizationId: string }> = {}): Activity {
    return Activity.create(
      {
        ownerId: OWNER_ID,
        type: "email",
        subject: "Apresentação WB",
        completed: true,
        completedAt: new Date("2024-01-10T08:00:00Z"),
        meetingNoShow: false,
        emailReplied: false,
        emailOpenCount: 0,
        emailLinkClickCount: 0,
        emailThreadId: threadId,
        emailSubject: "Apresentação WB",
        // outbound has NO emailFromAddress (that's how the UI distinguishes sent from received)
        ...links,
      },
      new UniqueEntityID(),
    );
  }

  const URIBL_DSN = (email: string) =>
    `Final-Recipient: rfc822; ${email}\nAction: failed\nStatus: 5.7.0\nDiagnostic-Code: smtp; 554 Rejected by URIBL.`;

  it("marks the 1:1 outbound activity failed (matched by threadId) on a permanent bounce", async () => {
    const activity = makeOutboundActivity("thread-1to1", { leadId: "lead-1" });
    activitiesRepo.items.push(activity);

    const result = await useCase.execute(makeMessage({
      from: "mailer-daemon@googlemail.com",
      threadId: "thread-1to1",
      subject: "Delivery Status Notification (Failure)",
      bodyText: URIBL_DSN("compras@cliente.com.br"),
    }), OWNER_ID);

    expect(result.unwrap().bounced).toBe(true);
    const updated = activitiesRepo.items.find((a) => a.emailThreadId === "thread-1to1")!;
    expect(updated.failedAt).toBeDefined();
    expect(updated.completed).toBe(false);
    // diagnostic from the DSN is captured into failReason
    expect(updated.failReason).toContain("554 Rejected by URIBL");
  });

  it("creates an EMAIL_BOUNCED notification linked to the matched lead", async () => {
    const activity = makeOutboundActivity("thread-notify", { leadId: "lead-77" });
    activitiesRepo.items.push(activity);

    await useCase.execute(makeMessage({
      from: "mailer-daemon@googlemail.com",
      threadId: "thread-notify",
      bodyText: URIBL_DSN("x@cliente.com"),
    }), OWNER_ID);

    const notif = createNotification.calls.find((c) => c.type === "EMAIL_BOUNCED");
    expect(notif).toBeDefined();
    expect(notif!.userId).toBe(OWNER_ID);
    expect(JSON.parse(notif!.payload as string).link).toBe("/leads/lead-77");
  });

  it("falls back to a generic reason when the DSN has no diagnostic code", async () => {
    const activity = makeOutboundActivity("thread-nodiag", { contactId: "c-1" });
    activitiesRepo.items.push(activity);

    await useCase.execute(makeMessage({
      from: "mailer-daemon@googlemail.com",
      threadId: "thread-nodiag",
      bodyText: "Final-Recipient: rfc822; y@cliente.com\nStatus: 5.1.1",
    }), OWNER_ID);

    const updated = activitiesRepo.items.find((a) => a.emailThreadId === "thread-nodiag")!;
    expect(updated.failedAt).toBeDefined();
    expect(updated.failReason).toBe("Email retornou (bounce)");
  });

  it("does not touch an inbound activity (has emailFromAddress) in the same thread", async () => {
    const inbound = Activity.create({
      ownerId: OWNER_ID, type: "email", subject: "Re: oi", completed: true,
      meetingNoShow: false, emailReplied: false, emailOpenCount: 0, emailLinkClickCount: 0,
      emailThreadId: "thread-shared", emailFromAddress: "cliente@x.com",
    }, new UniqueEntityID());
    activitiesRepo.items.push(inbound);

    await useCase.execute(makeMessage({
      from: "mailer-daemon@googlemail.com",
      threadId: "thread-shared",
      bodyText: URIBL_DSN("cliente@x.com"),
    }), OWNER_ID);

    expect(inbound.failedAt).toBeUndefined();
    expect(inbound.completed).toBe(true);
    expect(createNotification.calls.some((c) => c.type === "EMAIL_BOUNCED")).toBe(false);
  });

  it("does not re-fail a 1:1 activity already marked failed", async () => {
    const activity = makeOutboundActivity("thread-already", { leadId: "lead-1" });
    activity.fail("Erro anterior");
    const originalFailedAt = activity.failedAt!;
    activitiesRepo.items.push(activity);
    await new Promise((res) => setTimeout(res, 5));

    await useCase.execute(makeMessage({
      from: "mailer-daemon@googlemail.com",
      threadId: "thread-already",
      bodyText: URIBL_DSN("z@cliente.com"),
    }), OWNER_ID);

    const after = activitiesRepo.items.find((a) => a.emailThreadId === "thread-already")!;
    expect(after.failedAt!.getTime()).toBe(originalFailedAt.getTime());
    expect(createNotification.calls.some((c) => c.type === "EMAIL_BOUNCED")).toBe(false);
  });

  it("does not fail any 1:1 activity on a transient delay", async () => {
    const activity = makeOutboundActivity("thread-delay", { leadId: "lead-1" });
    activitiesRepo.items.push(activity);

    const result = await useCase.execute(makeMessage({
      from: "mailer-daemon@googlemail.com",
      threadId: "thread-delay",
      subject: "Delivery Status Notification (Delay)",
      bodyText: "wasn't delivered to z@cliente.com. The server will retry. Action: delayed\nStatus: 4.4.1",
    }), OWNER_ID);

    expect(result.unwrap().delayed).toBe(true);
    expect(activity.failedAt).toBeUndefined();
    expect(activity.completed).toBe(true);
  });
});

// ── Cancel pending scheduled sends when the contact/lead replies ───────────────
import { InMemoryScheduledEmailSendsRepository } from "../../fakes/in-memory-scheduled-email-sends.repository";
import { ScheduledEmailSend } from "@/domain/integrations/email/enterprise/entities/scheduled-email-send";

describe("ProcessIncomingEmailUseCase — cancels pending scheduled sends on reply", () => {
  let scheduledRepo: InMemoryScheduledEmailSendsRepository;
  let emailMessagesRepo2: FakeEmailMessagesRepository;
  let activitiesRepo2: FakeActivitiesRepository;
  let contacts2: FakeContacts;
  let leadContacts2: FakeLeadContacts;
  let useCase2: ProcessIncomingEmailUseCase;

  function makePendingScheduled(opts: { leadId?: string; contactId?: string; activityId?: string }) {
    return ScheduledEmailSend.create({
      ownerId: OWNER_ID,
      activityId: opts.activityId ?? null,
      scheduledSendAt: new Date("2026-07-10T09:00:00Z"),
      to: "sender@example.com",
      subject: "Follow-up",
      bodyHtml: "<p>oi</p>",
      fromEmail: null,
      threadId: null,
      attachments: [],
      leadId: opts.leadId ?? null,
      contactId: opts.contactId ?? null,
      contactIds: opts.contactId ? [opts.contactId] : [],
      organizationId: null,
      dealId: null,
    });
  }

  beforeEach(() => {
    scheduledRepo = new InMemoryScheduledEmailSendsRepository();
    emailMessagesRepo2 = new FakeEmailMessagesRepository();
    activitiesRepo2 = new FakeActivitiesRepository();
    contacts2 = new FakeContacts();
    leadContacts2 = new FakeLeadContacts();

    useCase2 = new ProcessIncomingEmailUseCase(
      emailMessagesRepo2,
      activitiesRepo2,
      contacts2 as never,
      leadContacts2 as never,
      new FakeOrganizations() as never,
      new FakeCampaigns() as never,
      new FakeRecipients() as never,
      new FakeSends() as never,
      new FakeSuppressions() as never,
      new FakeCreateNotification() as never,
      scheduledRepo,
    );
  });

  it("cancels a pending scheduled send when the matched lead replies", async () => {
    leadContacts2.map[`${OWNER_ID}|sender@example.com`] = "lead-1";
    const pending = makePendingScheduled({ leadId: "lead-1" });
    await scheduledRepo.save(pending);

    await useCase2.execute(makeMessage(), OWNER_ID);

    const saved = await scheduledRepo.findById(pending.id.toString());
    expect(saved!.status).toBe("CANCELLED");
    expect(saved!.cancelledAt).toBeDefined();
  });

  it("skips the linked pending activity when cancelling", async () => {
    contacts2.map[`${OWNER_ID}|sender@example.com`] = "contact-1";
    const activity = activitiesRepo2.createAndAdd({
      ownerId: OWNER_ID,
      type: "email",
      subject: "Follow-up",
      completed: false,
      scheduledSendAt: new Date("2026-07-10T09:00:00Z"),
      meetingNoShow: false,
      emailReplied: false,
      emailOpenCount: 0,
      emailLinkClickCount: 0,
    });
    const pending = makePendingScheduled({ contactId: "contact-1", activityId: activity.id.toString() });
    await scheduledRepo.save(pending);

    await useCase2.execute(makeMessage(), OWNER_ID);

    const updated = await activitiesRepo2.findByIdRaw(activity.id.toString());
    expect(updated!.skippedAt).toBeDefined();
    expect(updated!.scheduledSendAt).toBeUndefined();
  });

  it("does not touch already-sent records", async () => {
    leadContacts2.map[`${OWNER_ID}|sender@example.com`] = "lead-1";
    const pending = makePendingScheduled({ leadId: "lead-1" });
    pending.markSent("m", "t");
    await scheduledRepo.save(pending);

    await useCase2.execute(makeMessage(), OWNER_ID);

    const saved = await scheduledRepo.findById(pending.id.toString());
    expect(saved!.status).toBe("SENT");
  });
});
