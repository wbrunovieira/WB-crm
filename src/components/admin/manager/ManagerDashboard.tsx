"use client";

import { DateRangePicker } from "./DateRangePicker";
import { StatsOverview } from "./StatsOverview";
import { LeadsChart } from "./LeadsChart";
import { DealsChart } from "./DealsChart";
import { ActivitiesChart } from "./ActivitiesChart";
import { StageChangesChart } from "./StageChangesChart";
import { UserPerformanceTable } from "./UserPerformanceTable";
import type { ManagerStats } from "@/actions/admin-manager";
import type { PeriodOption } from "@/lib/validations/manager";

interface ManagerDashboardProps {
  stats: ManagerStats;
  currentPeriod: PeriodOption;
  startDate?: string;
  endDate?: string;
}

export function ManagerDashboard({
  stats,
  currentPeriod,
  startDate,
  endDate,
}: ManagerDashboardProps) {
  // Format period display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
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

      {/* User Performance Table */}
      <div className="bg-[#1a0022] rounded-xl border border-[#792990]/30 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Performance por Usuário</h2>
        <UserPerformanceTable byUser={stats.byUser} />
      </div>
    </div>
  );
}
