"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Phone, Clock, TrendingUp, Award } from "lucide-react";

type Props = {
  callsPerDay: Record<string, number>;
  avgDuration: number | null;
  maxDuration: number | null;
  weekStart: string; // YYYY-MM-DD
};

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function CallsStats({ callsPerDay, avgDuration, maxDuration }: Props) {
  const chartData = Object.entries(callsPerDay).map(([date, calls]) => {
    const d = new Date(date + "T00:00:00.000Z");
    return {
      day: DAY_NAMES[d.getUTCDay()],
      date,
      calls,
    };
  });

  const totalCalls = chartData.reduce((s, d) => s + d.calls, 0);
  const businessDays = chartData.filter((d) => {
    const idx = new Date(d.date + "T00:00:00.000Z").getUTCDay();
    return idx >= 1 && idx <= 5;
  });
  const avgPerDay = businessDays.length > 0
    ? (totalCalls / businessDays.length).toFixed(1)
    : "0";

  const stats = [
    {
      icon: Phone,
      label: "Total de ligações",
      value: totalCalls.toString(),
      color: "text-purple-400",
    },
    {
      icon: TrendingUp,
      label: "Média por dia útil",
      value: avgPerDay,
      color: "text-blue-400",
    },
    {
      icon: Clock,
      label: "Duração média",
      value: avgDuration !== null ? formatDuration(avgDuration) : "–",
      color: "text-yellow-400",
    },
    {
      icon: Award,
      label: "Ligação mais longa",
      value: maxDuration !== null ? formatDuration(maxDuration) : "–",
      color: "text-green-400",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            className="rounded-xl p-4 border"
            style={{ backgroundColor: "#1a0022", borderColor: "#792990" }}
          >
            <Icon className={`h-5 w-5 ${color} mb-2`} />
            <div className="text-xl font-bold text-white">{value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: "#1a0022", borderColor: "#792990" }}
      >
        <h3 className="text-sm font-semibold text-white mb-4">Ligações por dia</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a0033" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#1a0022", border: "1px solid #792990", borderRadius: 8 }}
              labelStyle={{ color: "#e5e7eb" }}
              itemStyle={{ color: "#c084fc" }}
              formatter={(value: number | undefined) => [value != null ? `${value} ligações` : ""]}
            />
            <Bar dataKey="calls" fill="#792990" radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
