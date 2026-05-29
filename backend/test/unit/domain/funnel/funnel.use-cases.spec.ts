import { describe, it, expect, beforeEach } from "vitest";
import {
  GetFunnelStatsUseCase,
  GetWeeklyGoalsUseCase,
  GetWeeklyFunnelDataUseCase,
  UpsertWeeklyGoalUseCase,
} from "@/domain/funnel/application/use-cases/funnel.use-cases";
import {
  FunnelRepository,
  type FunnelStats,
  type WeeklyGoalRecord,
  type WeeklyFunnelData,
} from "@/domain/funnel/application/repositories/funnel.repository";

class FakeFunnelRepository extends FunnelRepository {
  public statsCalls: (string | undefined)[] = [];
  public stats: FunnelStats = { leadsTotal: 0, callsTotal: 0, connectionsTotal: 0, meetingsTotal: 0, dealsWon: 0, dealsTotal: 0 };
  public goals: WeeklyGoalRecord[] = [];
  public weeklyData: WeeklyFunnelData = { activities: [], wonDeals: [], targetSales: 6 };
  public upsertCalls: { ownerId: string; weekStart: Date; targetSales: number }[] = [];

  async getStats(ownerId?: string): Promise<FunnelStats> {
    this.statsCalls.push(ownerId);
    return this.stats;
  }
  async findWeeklyGoals(_ownerId: string): Promise<WeeklyGoalRecord[]> { return this.goals; }
  async findWeeklyData(): Promise<WeeklyFunnelData> { return this.weeklyData; }
  async upsertWeeklyGoal(ownerId: string, weekStart: Date, targetSales: number): Promise<WeeklyGoalRecord> {
    this.upsertCalls.push({ ownerId, weekStart, targetSales });
    return { id: "g1", weekStart, targetSales, ownerId };
  }
}

describe("Funnel use cases", () => {
  let repo: FakeFunnelRepository;

  beforeEach(() => { repo = new FakeFunnelRepository(); });

  describe("GetFunnelStatsUseCase — owner scoping", () => {
    it("scopes to the requester for non-admin (ignores ownerId input)", async () => {
      const sut = new GetFunnelStatsUseCase(repo);
      await sut.execute({ requesterId: "u1", requesterRole: "sdr", ownerId: "someone-else" });
      expect(repo.statsCalls).toEqual(["u1"]);
    });

    it("admin with a specific ownerId scopes to that owner", async () => {
      const sut = new GetFunnelStatsUseCase(repo);
      await sut.execute({ requesterId: "admin", requesterRole: "admin", ownerId: "u9" });
      expect(repo.statsCalls).toEqual(["u9"]);
    });

    it("admin without ownerId sees all (undefined scope)", async () => {
      const sut = new GetFunnelStatsUseCase(repo);
      await sut.execute({ requesterId: "admin", requesterRole: "admin" });
      expect(repo.statsCalls).toEqual([undefined]);
    });

    it("returns the repository stats", async () => {
      repo.stats = { leadsTotal: 10, callsTotal: 5, connectionsTotal: 3, meetingsTotal: 2, dealsWon: 1, dealsTotal: 4 };
      const sut = new GetFunnelStatsUseCase(repo);
      const r = await sut.execute({ requesterId: "u1", requesterRole: "sdr" });
      expect(r.isRight()).toBe(true);
      expect(r.unwrap()).toEqual(repo.stats);
    });
  });

  describe("GetWeeklyGoalsUseCase", () => {
    it("returns the owner's goals", async () => {
      repo.goals = [{ id: "g1", weekStart: new Date("2026-01-05"), targetSales: 8, ownerId: "u1" }];
      const sut = new GetWeeklyGoalsUseCase(repo);
      const r = await sut.execute({ requesterId: "u1" });
      expect(r.unwrap()).toHaveLength(1);
      expect(r.unwrap()[0].targetSales).toBe(8);
    });
  });

  describe("GetWeeklyFunnelDataUseCase", () => {
    it("returns activities, wonDeals and targetSales from the repository", async () => {
      repo.weeklyData = {
        activities: [{ type: "call", gotoDuration: 60, gotoCallOutcome: "answered", callContactType: "decisor", completed: true, meetingNoShow: false, dueDate: new Date(), leadId: "l1", contactId: null }],
        wonDeals: [{ status: "won", closedAt: new Date() }],
        targetSales: 9,
      };
      const sut = new GetWeeklyFunnelDataUseCase(repo);
      const r = await sut.execute({ requesterId: "u1", weekStart: new Date("2026-01-05"), weekEnd: new Date("2026-01-12") });
      expect(r.isRight()).toBe(true);
      expect(r.unwrap().activities).toHaveLength(1);
      expect(r.unwrap().wonDeals).toHaveLength(1);
      expect(r.unwrap().targetSales).toBe(9);
    });
  });

  describe("UpsertWeeklyGoalUseCase", () => {
    it("delegates to the repository and returns the saved goal", async () => {
      const sut = new UpsertWeeklyGoalUseCase(repo);
      const weekStart = new Date("2026-01-05");
      const r = await sut.execute({ requesterId: "u1", weekStart, targetSales: 7 });
      expect(r.isRight()).toBe(true);
      expect(r.unwrap().targetSales).toBe(7);
      expect(repo.upsertCalls).toEqual([{ ownerId: "u1", weekStart, targetSales: 7 }]);
    });
  });
});
