"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { UserMetrics } from "@/types/admin-manager";

interface LeadsChartProps {
  byUser: UserMetrics[];
}

export function LeadsChart({ byUser }: LeadsChartProps) {
  // Transform data for chart
  const chartData = byUser
    .filter((u) => u.leads.created > 0)
    .map((user) => ({
      name: user.userName.split(" ")[0], // First name only
      criados: user.leads.created,
      convertidos: user.leads.converted,
    }))
    .sort((a, b) => b.criados - a.criados);

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        Nenhum lead criado no período
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--brand-accent) 20%, transparent)" />
        <XAxis
          dataKey="name"
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          axisLine={{ stroke: "color-mix(in srgb, var(--brand-accent) 30%, transparent)" }}
        />
        <YAxis
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          axisLine={{ stroke: "color-mix(in srgb, var(--brand-accent) 30%, transparent)" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--brand-surface)",
            border: "1px solid var(--brand-border)",
            borderRadius: "8px",
            color: "#fff",
          }}
        />
        <Legend />
        <Bar
          dataKey="criados"
          name="Criados"
          fill="var(--brand-accent)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="convertidos"
          name="Convertidos"
          fill="#22c55e"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
