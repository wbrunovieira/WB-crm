import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/notifications
 *
 * Lists notifications for the current user.
 * Query params:
 *   - type: Filter by notification type (e.g., LEAD_RESEARCH_COMPLETE)
 *   - read: Filter by read status (true/false)
 *   - limit: Max number of notifications to return (default 10)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || undefined;
    const readParam = searchParams.get("read");
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const read =
      readParam === "true" ? true : readParam === "false" ? false : undefined;

    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
        ...(type && { type }),
        ...(read !== undefined && { read }),
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("[Notifications] Error fetching:", error);
    return NextResponse.json(
      { error: "Erro ao buscar notificações" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 *
 * Mark notifications as read.
 * Body:
 *   - ids: Array of notification IDs to mark as read
 *   - all: If true, mark all unread notifications as read
 */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ids, all } = body as { ids?: string[]; all?: boolean };

    if (all) {
      // Mark all unread notifications as read
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          read: false,
        },
        data: {
          read: true,
        },
      });
    } else if (ids && ids.length > 0) {
      // Mark specific notifications as read
      await prisma.notification.updateMany({
        where: {
          id: { in: ids },
          userId: session.user.id,
        },
        data: {
          read: true,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Notifications] Error updating:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar notificações" },
      { status: 500 }
    );
  }
}
