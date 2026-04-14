import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseWeekStart(s: string): Date {
  const d = new Date(`${s}T00:00:00.000Z`);
  if (isNaN(d.getTime())) throw new Error("Invalid weekStart date");
  return d;
}

/**
 * GET /api/funnel/goals?weekStart=YYYY-MM-DD
 * Returns the WeeklyGoal for the session user, or null if none set.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekStartParam = searchParams.get("weekStart");
    if (!weekStartParam) {
      return NextResponse.json({ error: "weekStart is required" }, { status: 400 });
    }

    let weekStart: Date;
    try {
      weekStart = parseWeekStart(weekStartParam);
    } catch {
      return NextResponse.json({ error: "Invalid weekStart" }, { status: 400 });
    }

    const goal = await prisma.weeklyGoal.findUnique({
      where: { weekStart_ownerId: { weekStart, ownerId: session.user.id } },
    });

    return NextResponse.json(goal ?? null);
  } catch (error) {
    console.error("[Funnel/goals GET] Error:", error);
    return NextResponse.json({ error: "Erro ao buscar meta" }, { status: 500 });
  }
}

/**
 * POST /api/funnel/goals
 * Body: { weekStart: "YYYY-MM-DD", targetSales: number }
 * Upserts the WeeklyGoal.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { weekStart: weekStartStr, targetSales } = body as {
      weekStart: string;
      targetSales: number;
    };

    if (!weekStartStr || typeof targetSales !== "number" || targetSales < 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    let weekStart: Date;
    try {
      weekStart = parseWeekStart(weekStartStr);
    } catch {
      return NextResponse.json({ error: "Invalid weekStart" }, { status: 400 });
    }

    const goal = await prisma.weeklyGoal.upsert({
      where: { weekStart_ownerId: { weekStart, ownerId: session.user.id } },
      update: { targetSales },
      create: { weekStart, targetSales, ownerId: session.user.id },
    });

    return NextResponse.json(goal);
  } catch (error) {
    console.error("[Funnel/goals POST] Error:", error);
    return NextResponse.json({ error: "Erro ao salvar meta" }, { status: 500 });
  }
}
