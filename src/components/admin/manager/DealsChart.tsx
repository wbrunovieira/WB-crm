"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import type { TotalMetrics } from "@/actions/admin-manager";

interface DealsChartProps {
  deals: TotalMetrics["deals"];
}

const COLORS = {
  open: "#792990",
  won: "#22c55e",
  lost: "#ef4444",
};

export function DealsChart({ deals }: DealsChartProps) {
  const chartData = [
    { name: "Em aberto", value: deals.open, key: "open" },
    { name: "Ganhos", value: deals.won, key: "won" },
    { name: "Perdidos", value: deals.lost, key: "lost" },
  ].filter((item) => item.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        Nenhum negócio no período
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.key}
                fill={COLORS[entry.key as keyof typeof COLORS]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a0022",
              border: "1px solid #792990",
              borderRadius: "8px",
              color: "#fff",
            }}
          />
          <Legend
            formatter={(value) => <span className="text-gray-300">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Summary below chart */}
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div>
          <p className="text-gray-400">Valor Total</p>
          <p className="text-white font-semibold">{formatCurrency(deals.totalValue)}</p>
        </div>
        <div>
          <p className="text-gray-400">Valor Médio</p>
          <p className="text-white font-semibold">{formatCurrency(deals.avgValue)}</p>
        </div>
        <div>
          <p className="text-gray-400">Total</p>
          <p className="text-white font-semibold">{deals.total}</p>
        </div>
      </div>
    </div>
  );
}
