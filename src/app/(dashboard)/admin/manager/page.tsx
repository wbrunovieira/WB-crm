import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { backendFetch } from "@/lib/backend/client";
import type { ManagerStats } from "@/types/admin-manager";
import { ManagerDashboard } from "@/components/admin/manager";
import { type PeriodOption } from "@/lib/validations/manager";

/** Monday of a given week offset (0 = current, -1 = last, ...) */
function getWeekMonday(offset: number): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  monday.setUTCDate(monday.getUTCDate() + offset * 7);
  return monday;
}

/** Target date given day offset (0 = today, -1 = yesterday, ...) */
function getTargetDay(offset: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset));
}

interface PageProps {
  searchParams: Promise<{
    period?: string;
    startDate?: string;
    endDate?: string;
    weekOffset?: string;
    dayOffset?: string;
  }>;
}

export default async function ManagerPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Only admin can access
  if (session.user.role?.toLowerCase() !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const period = (params.period as PeriodOption) || "month";
  const weekOffset = Math.min(0, parseInt(params.weekOffset ?? "0", 10));
  const dayOffset = Math.min(0, parseInt(params.dayOffset ?? "0", 10));

  let startDate = params.startDate;
  let endDate = params.endDate;
  let backendPeriod = period;

  // Resolve navigable periods to explicit date ranges
  if (period === "week") {
    const monday = getWeekMonday(weekOffset);
    const friday = new Date(monday.getTime() + 4 * 24 * 60 * 60 * 1000);
    startDate = monday.toISOString().slice(0, 10);
    endDate = friday.toISOString().slice(0, 10);
    backendPeriod = "custom";
  } else if (period === "today") {
    const day = getTargetDay(dayOffset);
    startDate = day.toISOString().slice(0, 10);
    endDate = startDate;
    backendPeriod = "custom";
  }

  const qs = new URLSearchParams({ period: backendPeriod });
  if (startDate) qs.set("startDate", startDate);
  if (endDate) qs.set("endDate", endDate);
  const stats = await backendFetch<ManagerStats>(`/dashboard/stats?${qs}`);

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8">
      <ManagerDashboard
        stats={stats}
        currentPeriod={period}
        startDate={startDate}
        endDate={endDate}
        weekOffset={weekOffset}
        dayOffset={dayOffset}
      />
    </div>
  );
}

export const metadata = {
  title: "Gerenciador | Admin | WB CRM",
  description: "Dashboard de gerenciamento e métricas de usuários",
};
