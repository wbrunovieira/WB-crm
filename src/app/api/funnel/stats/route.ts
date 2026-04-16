import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeFunnelStats } from "@/lib/funnel/computeFunnelStats";

/** Parse a YYYY-MM-DD string as UTC midnight. */
function parseWeekStart(s: string): Date {
  const d = new Date(`${s}T00:00:00.000Z`);
  if (isNaN(d.getTime())) throw new Error("Invalid weekStart date");
  return d;
}

/**
 * GET /api/funnel/stats?weekStart=YYYY-MM-DD
 *
 * Returns funnel stats for the given week plus call duration metrics.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekStartParam = searchParams.get("weekStart");

    let weekStart: Date;
    if (weekStartParam) {
      try {
        weekStart = parseWeekStart(weekStartParam);
      } catch {
        return NextResponse.json({ error: "Invalid weekStart" }, { status: 400 });
      }
    } else {
      // Default: current week (Monday UTC)
      const now = new Date();
      const day = now.getUTCDay(); // 0=Sun, 1=Mon, ...
      const diff = (day === 0 ? -6 : 1 - day);
      weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
    }

    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const ownerId = session.user.id;

    const [activities, deals] = await Promise.all([
      prisma.activity.findMany({
        where: {
          ownerId,
          dueDate: { gte: weekStart, lt: weekEnd },
        },
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
        where: {
          ownerId,
          status: "won",
          closedAt: { gte: weekStart, lt: weekEnd },
        },
        select: { status: true, closedAt: true },
      }),
    ]);

    const stats = computeFunnelStats(activities, deals, weekStart, weekEnd);

    // Call duration metrics (all calls in the week that have a duration)
    const callsWithDuration = activities.filter(
      (a) => a.type === "call" && a.gotoDuration !== null
    );
    const durations = callsWithDuration.map((a) => a.gotoDuration as number);
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
      : null;
    const maxDuration = durations.length > 0 ? Math.max(...durations) : null;

    // Calls per day (Mon–Sun): key = ISO date string YYYY-MM-DD
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

    return NextResponse.json({
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      stats,
      callsPerDay,
      avgDuration,
      maxDuration,
    });
  } catch (error) {
    console.error("[Funnel/stats] Error:", error);
    return NextResponse.json({ error: "Erro ao buscar stats" }, { status: 500 });
  }
}
