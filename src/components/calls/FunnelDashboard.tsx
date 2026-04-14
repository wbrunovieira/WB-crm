"use client";

import { useState } from "react";
import type { FunnelStats } from "@/lib/funnel/computeFunnelStats";
import { computeGoalBreakdown, type GoalBreakdown } from "@/lib/funnel/computeGoalBreakdown";
import { FunnelVisualization } from "./FunnelVisualization";
import { GoalSetter } from "./GoalSetter";
import { CallsStats } from "./CallsStats";

type Props = {
  weekStart: string;  // YYYY-MM-DD
  stats: FunnelStats;
  callsPerDay: Record<string, number>;
  avgDuration: number | null;
  maxDuration: number | null;
  initialTargetSales: number;
};

function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00.000Z");
  const end = new Date(d.getTime() + 6 * 24 * 60 * 60 * 1000);
  const fmt = (dt: Date) =>
    dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  return `Semana de ${fmt(d)} a ${fmt(end)}`;
}

export function FunnelDashboard({
  weekStart,
  stats,
  callsPerDay,
  avgDuration,
  maxDuration,
  initialTargetSales,
}: Props) {
  const [breakdown, setBreakdown] = useState<GoalBreakdown>(
    computeGoalBreakdown(initialTargetSales)
  );

  return (
    <div className="space-y-6">
      {/* Week label */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-purple-300">{formatWeekLabel(weekStart)}</h2>
      </div>

      {/* Goal setter */}
      <GoalSetter
        weekStart={weekStart}
        initialTargetSales={initialTargetSales}
        onBreakdownChange={setBreakdown}
      />

      {/* Funnel */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: "#1a0022", borderColor: "#792990" }}
      >
        <h3 className="text-sm font-semibold text-white mb-4">Funil de vendas</h3>
        <FunnelVisualization stats={stats} breakdown={breakdown} />
      </div>

      {/* Calls stats + chart */}
      <CallsStats
        callsPerDay={callsPerDay}
        avgDuration={avgDuration}
        maxDuration={maxDuration}
        weekStart={weekStart}
      />
    </div>
  );
}
