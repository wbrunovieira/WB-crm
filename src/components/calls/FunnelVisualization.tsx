"use client";

import type { FunnelStats } from "@/lib/funnel/computeFunnelStats";
import type { GoalBreakdown } from "@/lib/funnel/computeGoalBreakdown";

type Stage = {
  label: string;
  count: number;
  goal: number;
  rate: number | null;
  rateLabel: string;
  color: string;
};

function pct(a: number, b: number): string {
  if (b === 0) return "–";
  return `${Math.round((a / b) * 100)}%`;
}

export function FunnelVisualization({
  stats,
  breakdown,
}: {
  stats: FunnelStats;
  breakdown: GoalBreakdown;
}) {
  const stages: Stage[] = [
    {
      label: "Ligações",
      count: stats.calls,
      goal: breakdown.requiredCalls,
      rate: null,
      rateLabel: "",
      color: "#792990",
    },
    {
      label: "Conexões",
      count: stats.connections,
      goal: breakdown.requiredConnections,
      rate: stats.calls > 0 ? stats.connections / stats.calls : null,
      rateLabel: "das ligações",
      color: "#6a2480",
    },
    {
      label: "Conexões c/ Decisor",
      count: stats.decisorConnections,
      goal: breakdown.requiredDecisorConnections,
      rate: stats.connections > 0 ? stats.decisorConnections / stats.connections : null,
      rateLabel: "das conexões",
      color: "#5c1f70",
    },
    {
      label: "Reuniões Marcadas",
      count: stats.meetingsScheduled,
      goal: breakdown.requiredMeetingsScheduled,
      rate: stats.decisorConnections > 0 ? stats.meetingsScheduled / stats.decisorConnections : null,
      rateLabel: "dos decisores",
      color: "#4e1960",
    },
    {
      label: "Reuniões Realizadas",
      count: stats.meetingsHeld,
      goal: breakdown.requiredMeetingsHeld,
      rate: stats.meetingsScheduled > 0 ? stats.meetingsHeld / stats.meetingsScheduled : null,
      rateLabel: "das marcadas",
      color: "#401450",
    },
    {
      label: "Vendas",
      count: stats.sales,
      goal: breakdown.targetSales,
      rate: stats.meetingsHeld > 0 ? stats.sales / stats.meetingsHeld : null,
      rateLabel: "das reuniões",
      color: "#320e40",
    },
  ];

  const maxGoal = Math.max(...stages.map((s) => s.goal), 1);

  return (
    <div className="space-y-1.5">
      {stages.map((stage, i) => {
        const widthPct = Math.max(30, Math.round((stage.goal / maxGoal) * 100));
        const progress = stage.goal > 0 ? Math.min(stage.count / stage.goal, 1) : 0;
        const achieved = stage.count >= stage.goal && stage.goal > 0;

        return (
          <div key={stage.label} className="flex items-center gap-3">
            {/* Funnel bar */}
            <div className="flex-1">
              <div
                className="mx-auto rounded-sm transition-all"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: stage.color,
                  padding: "10px 16px",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white truncate">
                    {stage.label}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {stage.rate !== null && (
                      <span className="text-[10px] text-purple-200">
                        {pct(stage.count, stage.count > 0 ? Math.round(stage.count / stage.rate) : 1)} {stage.rateLabel}
                      </span>
                    )}
                    <span className={`text-sm font-bold ${achieved ? "text-green-300" : "text-white"}`}>
                      {stage.count}
                    </span>
                    <span className="text-xs text-purple-300">/ {stage.goal}</span>
                  </div>
                </div>

                {/* Progress bar within the funnel bar */}
                <div className="mt-1.5 h-1 w-full rounded-full bg-white/10">
                  <div
                    className={`h-1 rounded-full transition-all ${achieved ? "bg-green-400" : "bg-white/60"}`}
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Conversion rate badge */}
            <div className="w-16 text-right flex-shrink-0">
              {i < stages.length - 1 && stage.count > 0 && (
                <span className="text-xs text-purple-300">
                  {pct(stages[i + 1].count, stage.count)}
                  <span className="block text-[10px] text-gray-500">conv.</span>
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
