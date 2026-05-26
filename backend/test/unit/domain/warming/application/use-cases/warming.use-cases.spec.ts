import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryWarmingAccountsRepository } from "../../fakes/in-memory-warming-accounts.repository";
import { InMemoryWarmingPoolEmailsRepository } from "../../fakes/in-memory-warming-pool-emails.repository";
import { InMemoryWarmingSendsRepository } from "../../fakes/in-memory-warming-sends.repository";
import { FakeGmailPort } from "../../fakes/fake-gmail.port";
import { AddWarmingAccountUseCase } from "@/domain/warming/application/use-cases/add-warming-account.use-case";
import { RemoveWarmingAccountUseCase } from "@/domain/warming/application/use-cases/remove-warming-account.use-case";
import { AddPoolEmailUseCase } from "@/domain/warming/application/use-cases/add-pool-email.use-case";
import { RemovePoolEmailUseCase } from "@/domain/warming/application/use-cases/remove-pool-email.use-case";
import { GetWarmingStatusUseCase } from "@/domain/warming/application/use-cases/get-warming-status.use-case";
import { RunWarmingCycleUseCase } from "@/domain/warming/application/use-cases/run-warming-cycle.use-case";
import { WarmingAccount } from "@/domain/warming/enterprise/entities/warming-account.entity";
import { WarmingPoolEmail } from "@/domain/warming/enterprise/entities/warming-pool-email.entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

const OWNER = "owner-1";

describe("AddWarmingAccountUseCase", () => {
  let accounts: InMemoryWarmingAccountsRepository;
  let sut: AddWarmingAccountUseCase;

  beforeEach(() => {
    accounts = new InMemoryWarmingAccountsRepository();
    sut = new AddWarmingAccountUseCase(accounts);
  });

  it("should add a new warming account", async () => {
    const result = await sut.execute({ email: "a@example.com", ownerId: OWNER });
    expect(result.isRight()).toBe(true);
    expect(accounts.items).toHaveLength(1);
    expect(accounts.items[0].email).toBe("a@example.com");
    expect(accounts.items[0].phase).toBe("ramping");
    expect(accounts.items[0].isActive).toBe(true);
  });

  it("should return error if email already registered", async () => {
    await sut.execute({ email: "a@example.com", ownerId: OWNER });
    const result = await sut.execute({ email: "a@example.com", ownerId: OWNER });
    expect(result.isLeft()).toBe(true);
  });
});

describe("RemoveWarmingAccountUseCase", () => {
  let accounts: InMemoryWarmingAccountsRepository;
  let sut: RemoveWarmingAccountUseCase;

  beforeEach(() => {
    accounts = new InMemoryWarmingAccountsRepository();
    sut = new RemoveWarmingAccountUseCase(accounts);
  });

  it("should remove existing account", async () => {
    const account = WarmingAccount.create({ email: "a@example.com", isActive: true, phase: "ramping", startedAt: new Date(), ownerId: OWNER });
    await accounts.save(account);

    const result = await sut.execute({ id: account.id.toString() });
    expect(result.isRight()).toBe(true);
    expect(accounts.items).toHaveLength(0);
  });

  it("should return error if account not found", async () => {
    const result = await sut.execute({ id: "non-existent" });
    expect(result.isLeft()).toBe(true);
  });
});

describe("AddPoolEmailUseCase", () => {
  let poolEmails: InMemoryWarmingPoolEmailsRepository;
  let sut: AddPoolEmailUseCase;

  beforeEach(() => {
    poolEmails = new InMemoryWarmingPoolEmailsRepository();
    sut = new AddPoolEmailUseCase(poolEmails);
  });

  it("should add email to pool", async () => {
    const result = await sut.execute({ email: "friend@gmail.com", name: "João", ownerId: OWNER });
    expect(result.isRight()).toBe(true);
    expect(poolEmails.items).toHaveLength(1);
    expect(poolEmails.items[0].email).toBe("friend@gmail.com");
    expect(poolEmails.items[0].name).toBe("João");
  });

  it("should return error if email already in pool for this owner", async () => {
    await sut.execute({ email: "friend@gmail.com", name: "João", ownerId: OWNER });
    const result = await sut.execute({ email: "friend@gmail.com", name: "João2", ownerId: OWNER });
    expect(result.isLeft()).toBe(true);
  });
});

describe("RemovePoolEmailUseCase", () => {
  let poolEmails: InMemoryWarmingPoolEmailsRepository;
  let sut: RemovePoolEmailUseCase;

  beforeEach(() => {
    poolEmails = new InMemoryWarmingPoolEmailsRepository();
    sut = new RemovePoolEmailUseCase(poolEmails);
  });

  it("should remove pool email", async () => {
    const pe = WarmingPoolEmail.create({ email: "x@x.com", name: null, isActive: true, ownerId: OWNER });
    await poolEmails.save(pe);

    const result = await sut.execute({ id: pe.id.toString() });
    expect(result.isRight()).toBe(true);
    expect(poolEmails.items).toHaveLength(0);
  });
});

describe("GetWarmingStatusUseCase", () => {
  let accounts: InMemoryWarmingAccountsRepository;
  let sends: InMemoryWarmingSendsRepository;
  let sut: GetWarmingStatusUseCase;

  beforeEach(() => {
    accounts = new InMemoryWarmingAccountsRepository();
    sends = new InMemoryWarmingSendsRepository();
    sut = new GetWarmingStatusUseCase(accounts, sends);
  });

  it("should return status with accounts and today count", async () => {
    const account = WarmingAccount.create({ email: "a@example.com", isActive: true, phase: "ramping", startedAt: new Date(), ownerId: OWNER });
    await accounts.save(account);

    const result = await sut.execute({ ownerId: OWNER });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.accounts).toHaveLength(1);
      expect(result.value.accounts[0].email).toBe("a@example.com");
      expect(result.value.accounts[0].todaySentCount).toBe(0);
      expect(result.value.accounts[0].dailyVolume).toBe(10);
    }
  });

  it("should return maintenance phase volume of 15", async () => {
    const account = WarmingAccount.create({
      email: "a@example.com", isActive: true, phase: "maintenance",
      startedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      ownerId: OWNER,
    });
    await accounts.save(account);

    const result = await sut.execute({ ownerId: OWNER });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.accounts[0].dailyVolume).toBe(15);
    }
  });
});

describe("RunWarmingCycleUseCase", () => {
  let accounts: InMemoryWarmingAccountsRepository;
  let poolEmails: InMemoryWarmingPoolEmailsRepository;
  let sends: InMemoryWarmingSendsRepository;
  let gmail: FakeGmailPort;
  let sut: RunWarmingCycleUseCase;

  beforeEach(() => {
    accounts = new InMemoryWarmingAccountsRepository();
    poolEmails = new InMemoryWarmingPoolEmailsRepository();
    sends = new InMemoryWarmingSendsRepository();
    gmail = new FakeGmailPort();
    sut = new RunWarmingCycleUseCase(accounts, poolEmails, sends, gmail);
  });

  it("should send emails between two warming accounts", async () => {
    const acc1 = WarmingAccount.create({ email: "a@example.com", isActive: true, phase: "ramping", startedAt: new Date(), ownerId: OWNER });
    const acc2 = WarmingAccount.create({ email: "b@example.com", isActive: true, phase: "ramping", startedAt: new Date(), ownerId: OWNER });
    await accounts.save(acc1);
    await accounts.save(acc2);

    const result = await sut.execute({ ownerId: OWNER, replyDelayMs: 0 });
    expect(result.isRight()).toBe(true);

    // Each account sends to the other + auto-reply
    expect(gmail.sentEmails.length).toBeGreaterThanOrEqual(2);
    const toEmails = gmail.sentEmails.map((e) => e.to);
    expect(toEmails).toContain("b@example.com");
    expect(toEmails).toContain("a@example.com");
  });

  it("should send to pool emails when there is remaining volume", async () => {
    const acc1 = WarmingAccount.create({ email: "a@example.com", isActive: true, phase: "ramping", startedAt: new Date(), ownerId: OWNER });
    await accounts.save(acc1);

    const pool1 = WarmingPoolEmail.create({ email: "friend1@gmail.com", name: "João", isActive: true, ownerId: OWNER });
    const pool2 = WarmingPoolEmail.create({ email: "friend2@gmail.com", name: "Maria", isActive: true, ownerId: OWNER });
    await poolEmails.save(pool1);
    await poolEmails.save(pool2);

    await sut.execute({ ownerId: OWNER });

    const toEmails = gmail.sentEmails.map((e) => e.to);
    expect(toEmails.some((e) => e === "friend1@gmail.com" || e === "friend2@gmail.com")).toBe(true);
  });

  it("should not send more than the daily volume", async () => {
    const acc1 = WarmingAccount.create({ email: "a@example.com", isActive: true, phase: "ramping", startedAt: new Date(), ownerId: OWNER });
    await accounts.save(acc1);

    // Add many pool emails
    for (let i = 0; i < 20; i++) {
      const pe = WarmingPoolEmail.create({ email: `friend${i}@gmail.com`, name: null, isActive: true, ownerId: OWNER });
      await poolEmails.save(pe);
    }

    await sut.execute({ ownerId: OWNER });

    // Daily volume for day 0 = 10 per account (1 account), so max 10 emails
    expect(gmail.sentEmails.length).toBeLessThanOrEqual(10);
  });

  it("should skip inactive accounts", async () => {
    const acc1 = WarmingAccount.create({ email: "a@example.com", isActive: false, phase: "ramping", startedAt: new Date(), ownerId: OWNER });
    await accounts.save(acc1);

    await sut.execute({ ownerId: OWNER });
    expect(gmail.sentEmails).toHaveLength(0);
  });

  it("should record sends in repository", async () => {
    const acc1 = WarmingAccount.create({ email: "a@example.com", isActive: true, phase: "ramping", startedAt: new Date(), ownerId: OWNER });
    const acc2 = WarmingAccount.create({ email: "b@example.com", isActive: true, phase: "ramping", startedAt: new Date(), ownerId: OWNER });
    await accounts.save(acc1);
    await accounts.save(acc2);

    await sut.execute({ ownerId: OWNER, replyDelayMs: 0 });

    expect(sends.items.length).toBeGreaterThan(0);
    expect(sends.items[0].fromEmail).toBeTruthy();
    expect(sends.items[0].toEmail).toBeTruthy();
  });

  it("should auto-promote ramping account to maintenance after 56 days", async () => {
    const startedAt = new Date(Date.now() - 57 * 24 * 60 * 60 * 1000);
    const acc = WarmingAccount.create({ email: "old@example.com", isActive: true, phase: "ramping", startedAt, ownerId: OWNER });
    await accounts.save(acc);

    await sut.execute({ ownerId: OWNER });

    const saved = accounts.items.find((a) => a.email === "old@example.com");
    expect(saved?.phase).toBe("maintenance");
  });

  it("should not promote account with less than 56 days", async () => {
    const startedAt = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    const acc = WarmingAccount.create({ email: "mid@example.com", isActive: true, phase: "ramping", startedAt, ownerId: OWNER });
    await accounts.save(acc);

    await sut.execute({ ownerId: OWNER });

    const saved = accounts.items.find((a) => a.email === "mid@example.com");
    expect(saved?.phase).toBe("ramping");
  });
});
