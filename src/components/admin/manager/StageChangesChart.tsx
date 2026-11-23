"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TotalMetrics } from "@/types/admin-manager";

interface StageChangesChartProps {
  stageChanges: TotalMetrics["stageChanges"];
}

export function StageChangesChart({ stageChanges }: StageChangesChartProps) {
  // Transform data for chart
  const chartData = stageChanges.byStage
    .map((sc) => ({
      name: `${sc.fromStage} → ${sc.toStage}`,
      mudancas: sc.count,
    }))
    .sort((a, b) => b.mudancas - a.mudancas)
    .slice(0, 10); // Top 10

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        Nenhuma mudança de etapa no período
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--brand-accent) 20%, transparent)" />
          <XAxis
            type="number"
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            axisLine={{ stroke: "color-mix(in srgb, var(--brand-accent) 30%, transparent)" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            axisLine={{ stroke: "color-mix(in srgb, var(--brand-accent) 30%, transparent)" }}
            width={110}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--brand-surface)",
              border: "1px solid var(--brand-border)",
              borderRadius: "8px",
              color: "#fff",
            }}
          />
          <Bar
            dataKey="mudancas"
            name="Mudanças"
            fill="#f59e0b"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="text-center">
        <p className="text-gray-400 text-sm">Total de mudanças de etapa</p>
        <p className="text-white text-2xl font-bold">{stageChanges.total}</p>
      </div>
    </div>
  );
}
