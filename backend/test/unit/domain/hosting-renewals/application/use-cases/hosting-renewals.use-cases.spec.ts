import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryHostingRenewalsRepository } from "../../fakes/in-memory-hosting-renewals.repository";
import { GetUpcomingRenewalsUseCase, CreateRenewalActivityUseCase } from "@/domain/hosting-renewals/application/use-cases/hosting-renewals.use-cases";

let repo: InMemoryHostingRenewalsRepository;

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

beforeEach(() => { repo = new InMemoryHostingRenewalsRepository(); });

describe("GetUpcomingRenewalsUseCase", () => {
  it("returns empty when no upcoming renewals", async () => {
    const r = await new GetUpcomingRenewalsUseCase(repo).execute({ requesterId: "u1" });
    expect(r.unwrap()).toHaveLength(0);
  });

  it("returns renewals within 30 days by default", async () => {
    repo.organizations = [
      { id: "o1", name: "Org 30d", hostingRenewalDate: daysFromNow(25), ownerId: "u1" },
      { id: "o2", name: "Org far", hostingRenewalDate: daysFromNow(60), ownerId: "u1" },
    ];
    const r = (await new GetUpcomingRenewalsUseCase(repo).execute({ requesterId: "u1" })).unwrap();
    expect(r).toHaveLength(1);
    expect(r[0].organizationName).toBe("Org 30d");
    expect(r[0].daysUntilRenewal).toBeGreaterThan(0);
    expect(r[0].daysUntilRenewal).toBeLessThanOrEqual(25);
  });

  it("respects custom daysAhead", async () => {
    repo.organizations = [
      { id: "o1", name: "Org 10d", hostingRenewalDate: daysFromNow(10), ownerId: "u1" },
      { id: "o2", name: "Org 25d", hostingRenewalDate: daysFromNow(25), ownerId: "u1" },
    ];
    const r = (await new GetUpcomingRenewalsUseCase(repo).execute({ requesterId: "u1", daysAhead: 15 })).unwrap();
    expect(r).toHaveLength(1);
    expect(r[0].organizationName).toBe("Org 10d");
  });

  it("returns only owner organizations", async () => {
    repo.organizations = [
      { id: "o1", name: "Mine", hostingRenewalDate: daysFromNow(5), ownerId: "u1" },
      { id: "o2", name: "Other", hostingRenewalDate: daysFromNow(5), ownerId: "u2" },
    ];
    const r = (await new GetUpcomingRenewalsUseCase(repo).execute({ requesterId: "u1" })).unwrap();
    expect(r).toHaveLength(1);
    expect(r[0].organizationName).toBe("Mine");
  });

  it("orders by daysUntilRenewal ascending", async () => {
    repo.organizations = [
      { id: "o1", name: "Late", hostingRenewalDate: daysFromNow(20), ownerId: "u1" },
      { id: "o2", name: "Soon", hostingRenewalDate: daysFromNow(5), ownerId: "u1" },
    ];
    const r = (await new GetUpcomingRenewalsUseCase(repo).execute({ requesterId: "u1" })).unwrap();
    expect(r[0].organizationName).toBe("Soon");
    expect(r[1].organizationName).toBe("Late");
  });
});

describe("CreateRenewalActivityUseCase", () => {
  it("creates activity with defaults", async () => {
    const r = await new CreateRenewalActivityUseCase(repo).execute({ organizationId: "o1", requesterId: "u1" });
    expect(r.isRight()).toBe(true);
    expect(r.unwrap().activityId).toBeDefined();
    expect(repo.activities).toHaveLength(1);
    expect(repo.activities[0].subject).toBe("Renovação de hospedagem");
  });

  it("creates activity with custom subject and dueDate", async () => {
    const dueDate = daysFromNow(10);
    const r = await new CreateRenewalActivityUseCase(repo).execute({
      organizationId: "o1",
      requesterId: "u1",
      dueDate,
      subject: "Contatar cliente para renovar hospedagem",
    });
    expect(r.isRight()).toBe(true);
    expect(repo.activities[0].subject).toBe("Contatar cliente para renovar hospedagem");
    expect(repo.activities[0].dueDate).toEqual(dueDate);
  });
});
