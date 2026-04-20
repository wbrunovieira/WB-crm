import { describe, it, expect } from "vitest";
import { Proposal } from "@/domain/proposals/enterprise/entities/proposal";
import { ProposalTitle } from "@/domain/proposals/enterprise/value-objects/proposal-title.vo";
import { ProposalStatus } from "@/domain/proposals/enterprise/value-objects/proposal-status.vo";

describe("ProposalTitle VO", () => {
  it("accepts valid title", () => expect(ProposalTitle.create("Proposta Empresa X").isRight()).toBe(true));
  it("trims whitespace", () => expect(ProposalTitle.create("  Proposta  ").unwrap().value).toBe("Proposta"));
  it("rejects empty", () => expect(ProposalTitle.create("").isLeft()).toBe(true));
  it("rejects title > 200 chars", () => expect(ProposalTitle.create("a".repeat(201)).isLeft()).toBe(true));
});

describe("ProposalStatus VO", () => {
  it("accepts draft/sent/accepted/rejected", () => {
    for (const s of ["draft", "sent", "accepted", "rejected"]) {
      expect(ProposalStatus.create(s).isRight()).toBe(true);
    }
  });
  it("rejects invalid", () => expect(ProposalStatus.create("pending").isLeft()).toBe(true));
  it("draft() factory", () => expect(ProposalStatus.draft().value).toBe("draft"));
});

describe("Proposal entity", () => {
  it("creates with default draft status", () => {
    const r = Proposal.create({ title: "Proposta Alpha", ownerId: "u1" });
    expect(r.isRight()).toBe(true);
    expect(r.unwrap().status).toBe("draft");
  });

  it("rejects empty title", () => {
    expect(Proposal.create({ title: "", ownerId: "u1" }).isLeft()).toBe(true);
  });

  it("rejects invalid status", () => {
    expect(Proposal.create({ title: "Test", ownerId: "u1", status: "invalid" }).isLeft()).toBe(true);
  });

  it("update changes title", () => {
    const p = Proposal.create({ title: "Original", ownerId: "u1" }).unwrap();
    p.update({ title: "Atualizada" });
    expect(p.title).toBe("Atualizada");
  });

  it("update to sent sets sentAt", () => {
    const p = Proposal.create({ title: "Test", ownerId: "u1" }).unwrap();
    p.update({ status: "sent" });
    expect(p.status).toBe("sent");
    expect(p.sentAt).toBeInstanceOf(Date);
  });

  it("update to sent does not override existing sentAt", () => {
    const sentAt = new Date("2026-01-01");
    const p = Proposal.create({ title: "Test", ownerId: "u1", status: "sent", sentAt }).unwrap();
    p.update({ status: "accepted" });
    expect(p.sentAt?.toISOString()).toBe(sentAt.toISOString());
  });

  it("links to lead and deal", () => {
    const p = Proposal.create({ title: "Test", ownerId: "u1", leadId: "l1", dealId: "d1" }).unwrap();
    expect(p.leadId).toBe("l1");
    expect(p.dealId).toBe("d1");
  });
});
