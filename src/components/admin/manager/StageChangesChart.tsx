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
import type { TotalMetrics } from "@/actions/admin-manager";

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
          <CartesianGrid strokeDasharray="3 3" stroke="#792990/20" />
          <XAxis
            type="number"
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            axisLine={{ stroke: "#792990/30" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            axisLine={{ stroke: "#792990/30" }}
            width={110}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a0022",
              border: "1px solid #792990",
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
