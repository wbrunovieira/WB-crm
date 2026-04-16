import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeFunnelStats } from "@/lib/funnel/computeFunnelStats";
import { FunnelDashboard } from "@/components/calls/FunnelDashboard";

/** Returns Monday of the current week at UTC midnight. */
function currentWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
}

export default async function CallsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const ownerId = session.user.id;
  const weekStart = currentWeekStart();
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [activities, deals, goalRecord] = await Promise.all([
    prisma.activity.findMany({
      where: { ownerId, dueDate: { gte: weekStart, lt: weekEnd } },
      select: {
        type: true,
        gotoDuration: true,
        callContactType: true,
        completed: true,
        meetingNoShow: true,
        dueDate: true,
        leadId: true,
        contactId: true,
      },
    }),
    prisma.deal.findMany({
      where: { ownerId, status: "won", closedAt: { gte: weekStart, lt: weekEnd } },
      select: { status: true, closedAt: true },
    }),
    prisma.weeklyGoal.findUnique({
      where: {
        weekStart_ownerId: { weekStart, ownerId },
      },
    }),
  ]);

  const stats = computeFunnelStats(activities, deals, weekStart, weekEnd);

  // Calls per day
  const callsPerDay: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
    callsPerDay[d.toISOString().slice(0, 10)] = 0;
  }
  for (const a of activities) {
    if (a.type === "call" && a.dueDate) {
      const key = a.dueDate.toISOString().slice(0, 10);
      if (key in callsPerDay) callsPerDay[key]++;
    }
  }

  // Duration metrics
  const durations = activities
    .filter((a) => a.type === "call" && a.gotoDuration !== null)
    .map((a) => a.gotoDuration as number);
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
    : null;
  const maxDuration = durations.length > 0 ? Math.max(...durations) : null;

  const weekStartStr = weekStart.toISOString().slice(0, 10);

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
          initialTargetSales={goalRecord?.targetSales ?? 6}
        />
      </div>
    </div>
  );
}
