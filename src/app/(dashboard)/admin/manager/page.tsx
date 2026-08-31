import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { backendFetch } from "@/lib/backend/client";
import type { ManagerStats } from "@/types/admin-manager";
import { ManagerDashboard } from "@/components/admin/manager";
import { type PeriodOption } from "@/lib/validations/manager";
import { getDayRange, getMonthRange, getWeekRange } from "@/lib/manager-periods";

interface PageProps {
  searchParams: Promise<{
    period?: string;
    startDate?: string;
    endDate?: string;
    weekOffset?: string;
    dayOffset?: string;
    monthOffset?: string;
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
  const monthOffset = Math.min(0, parseInt(params.monthOffset ?? "0", 10));

  let startDate = params.startDate;
  let endDate = params.endDate;
  let backendPeriod = period;

  // Resolve navigable periods to explicit date ranges. The week is Monday–Sunday and the
  // month is a calendar month (not rolling windows), so a given past week/month can be
  // browsed and no closed deal falls outside every period — see @/lib/manager-periods.
  const range =
    period === "week" ? getWeekRange(weekOffset)
    : period === "today" ? getDayRange(dayOffset)
    : period === "month" ? getMonthRange(monthOffset)
    : null;

  if (range) {
    startDate = range.start;
    endDate = range.end;
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
        monthOffset={monthOffset}
      />
    </div>
  );
}

export const metadata = {
  title: "Gerenciador | Admin | WB CRM",
  description: "Dashboard de gerenciamento e métricas de usuários",
};
