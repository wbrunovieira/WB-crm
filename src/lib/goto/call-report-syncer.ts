import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createCallActivity } from "./call-activity-creator";
import type { GoToCallReport } from "./types";

const log = logger.child({ context: "call-report-syncer" });

const GOTO_API = "https://api.goto.com";
const ACCOUNT_KEY = process.env.GOTO_ACCOUNT_KEY!;

interface SyncResult {
  fetched: number;
  created: number;
  skipped: number;
}

async function fetchReportsSince(
  accessToken: string,
  since: string
): Promise<GoToCallReport[]> {
  const reports: GoToCallReport[] = [];
  let nextPageMarker: string | undefined;

  do {
    const url = new URL(
      `${GOTO_API}/call-events-report/v1/reports`
    );
    url.searchParams.set("accountKey", ACCOUNT_KEY);
    url.searchParams.set("pageSize", "50");
    url.searchParams.set("startDate", since);
    if (nextPageMarker) url.searchParams.set("nextPageMarker", nextPageMarker);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      log.warn("Falha ao buscar call reports GoTo", { status: res.status });
      break;
    }

    const data = await res.json();
    reports.push(...(data.items ?? []));
    nextPageMarker = data.nextPageMarker;
  } while (nextPageMarker);

  return reports;
}

export async function syncCallReports(
  accessToken: string,
  ownerId: string
): Promise<SyncResult> {
  // Find the last synced call to use as the start date
  const lastActivity = await prisma.activity.findFirst({
    where: { gotoCallId: { not: null }, ownerId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  // Default to 24 hours ago if no previous sync
  const since = lastActivity
    ? new Date(lastActivity.createdAt.getTime() - 60_000).toISOString() // 1 min overlap
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  log.info("Iniciando sync de call reports GoTo", { since, ownerId });

  const reports = await fetchReportsSince(accessToken, since);

  let created = 0;
  let skipped = 0;

  for (const report of reports) {
    const exists = await prisma.activity.findFirst({
      where: { gotoCallId: report.conversationSpaceId },
      select: { id: true },
    });

    if (exists) {
      skipped++;
      continue;
    }

    try {
      await createCallActivity(report, ownerId);
      created++;
    } catch (err) {
      log.warn("Falha ao criar activity para report", {
        conversationSpaceId: report.conversationSpaceId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("Sync GoTo concluído", { fetched: reports.length, created, skipped });
  return { fetched: reports.length, created, skipped };
}
