"use client";

import { DateRangePicker } from "./DateRangePicker";
import { StatsOverview } from "./StatsOverview";
import { LeadsChart } from "./LeadsChart";
import { DealsChart } from "./DealsChart";
import { WonDealsList } from "./WonDealsList";
import { ForecastDealsList } from "./ForecastDealsList";
import { ActivitiesChart } from "./ActivitiesChart";
import { StageChangesChart } from "./StageChangesChart";
import { UserPerformanceTable } from "./UserPerformanceTable";
import { ActivityCalendar } from "./ActivityCalendar";
import type { DealsForecast, ManagerStats } from "@/types/admin-manager";
import type { PeriodOption } from "@/lib/validations/manager";

// Falls back when the separately-deployed backend is older than this frontend.
const EMPTY_FORECAST: DealsForecast = {
  deals: [],
  totalValue: 0,
  overdue: { count: 0, value: 0 },
  withoutDate: { count: 0, value: 0 },
};

interface ManagerDashboardProps {
  stats: ManagerStats;
  currentPeriod: PeriodOption;
  startDate?: string;
  endDate?: string;
  weekOffset?: number;
  dayOffset?: number;
  monthOffset?: number;
}

export function ManagerDashboard({
  stats,
  currentPeriod,
  startDate,
  endDate,
  weekOffset = 0,
  dayOffset = 0,
  monthOffset = 0,
}: ManagerDashboardProps) {
  // Format period display — timeZone: "UTC" matches how DateRangePicker's own labels
  // (getWeekLabel/getDayLabel/getMonthLabel) are built with Date.UTC; without it, a
  // Brazil-timezone browser shifts these dates back a day (e.g. "01 de ago." → "31 de jul.").
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Gerenciador</h1>
          <p className="text-gray-400 text-sm">
            {formatDate(stats.period.startDate)} - {formatDate(stats.period.endDate)}
          </p>
        </div>
        <DateRangePicker
          currentPeriod={currentPeriod}
          startDate={startDate}
          endDate={endDate}
          weekOffset={weekOffset}
          dayOffset={dayOffset}
          monthOffset={monthOffset}
        />
      </div>

      {/* Stats Overview */}
      <StatsOverview stats={stats} />

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by User */}
        <div className="bg-[#1a0022] rounded-xl border border-[#792990]/30 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Leads por Usuário</h2>
          <LeadsChart byUser={stats.byUser} />
        </div>

        {/* Deals by Status */}
        <div className="bg-[#1a0022] rounded-xl border border-[#792990]/30 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Negócios por Status</h2>
          <DealsChart deals={stats.totals.deals} />
        </div>
      </div>

      {/* Result vs pipeline, side by side: what was actually closed in the period, and what
          is still open and expected to close in it. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1a0022] rounded-xl border border-[#792990]/30 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Negócios ganhos no período</h2>
          <WonDealsList wonDeals={stats.totals.deals.wonDeals ?? []} />
        </div>

        <div className="bg-[#1a0022] rounded-xl border border-[#792990]/30 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Negócios previstos para o período</h2>
          <ForecastDealsList forecast={stats.totals.deals.forecast ?? EMPTY_FORECAST} />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activities by Type */}
        <div className="bg-[#1a0022] rounded-xl border border-[#792990]/30 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Atividades por Tipo</h2>
          <ActivitiesChart activities={stats.totals.activities} />
        </div>

        {/* Stage Changes */}
        <div className="bg-[#1a0022] rounded-xl border border-[#792990]/30 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Mudanças de Etapa</h2>
          <StageChangesChart stageChanges={stats.totals.stageChanges} />
        </div>
      </div>

      {/* Activity Calendar Heatmap */}
      <div className="bg-[#1a0022] rounded-xl border border-[#792990]/30 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Calendario de Atividades</h2>
        <ActivityCalendar />
      </div>

      {/* User Performance Table */}
      <div className="bg-[#1a0022] rounded-xl border border-[#792990]/30 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Performance por Usuario</h2>
        <UserPerformanceTable byUser={stats.byUser} />
      </div>
    </div>
  );
}
