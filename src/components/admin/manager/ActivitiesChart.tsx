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

interface ActivitiesChartProps {
  activities: TotalMetrics["activities"];
}

const activityTypeLabels: Record<string, string> = {
  call: "Ligação",
  meeting: "Reunião",
  email: "Email",
  task: "Tarefa",
  whatsapp: "WhatsApp",
  physical_visit: "Visita",
  instagram_dm: "Instagram",
};

export function ActivitiesChart({ activities }: ActivitiesChartProps) {
  // Transform data for chart
  const chartData = Object.entries(activities.byType)
    .map(([type, count]) => ({
      name: activityTypeLabels[type] || type,
      quantidade: count,
    }))
    .sort((a, b) => b.quantidade - a.quantidade);

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        Nenhuma atividade no período
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
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
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            axisLine={{ stroke: "#792990/30" }}
            width={70}
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
            dataKey="quantidade"
            name="Quantidade"
            fill="#792990"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-2 text-center text-sm">
        <div>
          <p className="text-gray-400">Total</p>
          <p className="text-white font-semibold">{activities.total}</p>
        </div>
        <div>
          <p className="text-gray-400">Concluídas</p>
          <p className="text-green-500 font-semibold">{activities.completed}</p>
        </div>
        <div>
          <p className="text-gray-400">Pendentes</p>
          <p className="text-yellow-500 font-semibold">{activities.pending}</p>
        </div>
        <div>
          <p className="text-gray-400">Atrasadas</p>
          <p className="text-red-500 font-semibold">{activities.overdue}</p>
        </div>
      </div>
    </div>
  );
}
