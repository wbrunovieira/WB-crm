import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isInternalRequest } from "@/lib/internal-auth";

/**
 * Webhook endpoint for Agent lead research callbacks
 *
 * Receives results from the Agent after lead research is complete.
 * The Agent sends this webhook when a lead research job finishes (success or error).
 *
 * This endpoint is only accessible from internal network (localhost, private IPs)
 * for security.
 */

type LeadResearchPayload = {
  jobId: string;
  status: "completed" | "error";
  createdLeads?: Array<{
    lead: {
      id: string;
      businessName: string;
      [key: string]: unknown;
    };
    contacts: Array<{
      id: string;
      name: string;
      [key: string]: unknown;
    }>;
  }>;
  rejected?: Array<{
    queryTerm: string;
    reason: string;
  }>;
  summary: string;
  error?: string;
  ownerId?: string; // User who initiated the request
};

export async function POST(request: Request) {
  try {
    // Verify request is from internal network
    if (!isInternalRequest(request)) {
      console.warn("[Webhook] Lead research webhook called from external IP");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload: LeadResearchPayload = await request.json();

    console.log("[Webhook] Received lead research callback:", {
      jobId: payload.jobId,
      status: payload.status,
      createdLeads: payload.createdLeads?.length || 0,
      rejected: payload.rejected?.length || 0,
    });

    // Find user to notify (use ownerId from payload or fallback to admin)
    let userId = payload.ownerId;

    if (!userId) {
      // Fallback: find admin user
      const adminUser = await prisma.user.findFirst({
        where: { role: "admin" },
        select: { id: true },
      });
      userId = adminUser?.id;
    }

    if (!userId) {
      console.error("[Webhook] No user found to create notification");
      return NextResponse.json({ ok: true }); // Still return 200 to not retry
    }

    // Create notification based on status
    const isError = payload.status === "error";
    const leadsCount = payload.createdLeads?.length || 0;

    const notification = await prisma.notification.create({
      data: {
        type: isError ? "LEAD_RESEARCH_ERROR" : "LEAD_RESEARCH_COMPLETE",
        jobId: payload.jobId,
        status: payload.status,
        title: isError
          ? "Pesquisa de leads falhou"
          : `${leadsCount} lead(s) criado(s)`,
        summary: payload.summary,
        payload: JSON.stringify(payload),
        read: false,
        userId,
      },
    });

    console.log("[Webhook] Notification created:", notification.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Webhook] Error processing lead research callback:", error);
    // Return 200 to prevent retries - the Agent already saved the leads
    return NextResponse.json({ ok: true });
  }
}
