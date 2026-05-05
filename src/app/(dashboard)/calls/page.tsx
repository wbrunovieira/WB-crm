import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { backendFetch } from "@/lib/backend/client";
import { computeFunnelStats, type FunnelActivity, type FunnelDeal } from "@/lib/funnel/computeFunnelStats";
import { FunnelDashboard } from "@/components/calls/FunnelDashboard";

export type TodayCallStats = {
  total: number;
  answered: number;
  noAnswer: number;
  voicemail: number;
  busy: number;
  decisor: number;
};

/** Returns Monday of the current week at UTC midnight. */
function currentWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
}

interface WeeklyFunnelData {
  activities: FunnelActivity[];
  wonDeals: FunnelDeal[];
  targetSales: number;
}

export default async function CallsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const weekStart = currentWeekStart();
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const data = await backendFetch<WeeklyFunnelData>(
    `/funnel/weekly-stats?weekStart=${weekStartStr}`
  ).catch(() => ({ activities: [], wonDeals: [], targetSales: 6 }));

  // Normalise dates (backendFetch returns plain JSON — dates are strings)
  const activities = data.activities.map((a) => ({
    ...a,
    dueDate: a.dueDate ? new Date(a.dueDate) : null,
  }));
  const wonDeals = data.wonDeals.map((d) => ({
    ...d,
    closedAt: d.closedAt ? new Date(d.closedAt) : null,
  }));

  const stats = computeFunnelStats(activities, wonDeals, weekStart, weekEnd);

  // Today in BR time (UTC-3)
  const nowBR = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const todayStr = nowBR.toISOString().slice(0, 10); // YYYY-MM-DD

  // Per-day stats for the whole week (for chevron navigation)
  function callsForDay(dateStr: string): TodayCallStats {
    const dayActivities = activities.filter((a) => {
      if (a.type !== "call" || !a.completed || !a.dueDate) return false;
      const dBR = new Date(a.dueDate.getTime() - 3 * 60 * 60 * 1000);
      return dBR.toISOString().slice(0, 10) === dateStr;
    });
    return {
      total: dayActivities.length,
      answered: dayActivities.filter((a) => a.gotoCallOutcome === "answered").length,
      noAnswer: dayActivities.filter((a) => a.gotoCallOutcome === "no_answer").length,
      voicemail: dayActivities.filter((a) => a.gotoCallOutcome === "voicemail").length,
      busy: dayActivities.filter((a) => a.gotoCallOutcome === "busy" || a.gotoCallOutcome === "rejected").length,
      decisor: dayActivities.filter((a) => a.callContactType === "decisor").length,
    };
  }

  const dailyStats: Record<string, TodayCallStats> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
    const dStr = d.toISOString().slice(0, 10);
    dailyStats[dStr] = callsForDay(dStr);
  }
  // Also ensure yesterday is included (in case it's in the previous week)
  const yesterdayBR = new Date(nowBR.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterdayBR.toISOString().slice(0, 10);
  if (!(yesterdayStr in dailyStats)) {
    dailyStats[yesterdayStr] = callsForDay(yesterdayStr);
  }

  // Calls per day — only completed calls, with answered + decisor breakdown
  const callsPerDay: Record<string, { total: number; answered: number; decisor: number }> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
    callsPerDay[d.toISOString().slice(0, 10)] = { total: 0, answered: 0, decisor: 0 };
  }
  for (const a of activities) {
    if (a.type === "call" && a.completed && a.dueDate) {
      const key = a.dueDate.toISOString().slice(0, 10);
      if (key in callsPerDay) {
        callsPerDay[key].total++;
        if (a.gotoCallOutcome === "answered") callsPerDay[key].answered++;
        if (a.callContactType === "decisor") callsPerDay[key].decisor++;
      }
    }
  }

  // Duration metrics — only completed calls with GoTo duration
  const durations = activities
    .filter((a) => a.type === "call" && a.completed && a.gotoDuration !== null)
    .map((a) => a.gotoDuration as number);
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
    : null;
  const maxDuration = durations.length > 0 ? Math.max(...durations) : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#350045" }}>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Funil de Vendas</h1>
          <p className="mt-1 text-sm text-purple-300">
            Acompanhe seu desempenho e metas semanais em tempo real
          </p>
        </div>

        <FunnelDashboard
          weekStart={weekStartStr}
          stats={stats}
          callsPerDay={callsPerDay}
          avgDuration={avgDuration}
          maxDuration={maxDuration}
          initialTargetSales={data.targetSales}
          dailyStats={dailyStats}
          todayDate={todayStr}
        />
      </div>
    </div>
  );
}
