"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";

interface DailyActivityData {
  date: string;
  total: number;
  completed: number;
  pending: number;
  failed: number;
  skipped: number;
  byType: Record<string, number>;
  completedByType: Record<string, number>;
  pendingByType: Record<string, number>;
  failedByType: Record<string, number>;
  skippedByType: Record<string, number>;
}

const activityTypeLabels: Record<string, { label: string; color: string }> = {
  call: { label: "Ligacao", color: "#3b82f6" },
  meeting: { label: "Reuniao", color: "#ec4899" },
  email: { label: "Email", color: "#8b5cf6" },
  task: { label: "Tarefa", color: "#f59e0b" },
  whatsapp: { label: "WhatsApp", color: "#22c55e" },
  linkedin: { label: "LinkedIn", color: "#0ea5e9" },
  instagram: { label: "Instagram", color: "#f43f5e" },
  physical_visit: { label: "Visita", color: "#14b8a6" },
  instagram_dm: { label: "Instagram DM", color: "#f43f5e" },
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function getIntensityClass(total: number): string {
  if (total === 0) return "bg-[#2d1b3d]";
  if (total <= 2) return "bg-[#792990]/30";
  if (total <= 5) return "bg-[#792990]/50";
  if (total <= 10) return "bg-[#792990]/70";
  return "bg-[#792990]";
}

export function ActivityCalendar() {
  const now = new Date();
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<DailyActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<DailyActivityData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch<DailyActivityData[]>(
        `/dashboard/activity-calendar?year=${year}&month=${month}`,
        token,
      );
      setData(result);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const goToPrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const goToToday = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  };

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const dataMap = new Map<string, DailyActivityData>();
  data.forEach((d) => dataMap.set(d.date, d));

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  const monthLabel = new Date(year, month - 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  // Summary stats for the month
  const monthTotal = data.reduce((s, d) => s + d.total, 0);
  const monthCompleted = data.reduce((s, d) => s + d.completed, 0);
  const monthPending = data.reduce((s, d) => s + d.pending, 0);
  const monthFailed = data.reduce((s, d) => s + d.failed, 0);
  const monthSkipped = data.reduce((s, d) => s + d.skipped, 0);
  const daysWithActivities = data.filter((d) => d.total > 0).length;
  const avgPerDay = daysWithActivities > 0 ? (monthTotal / daysWithActivities).toFixed(1) : "0";

  // Aggregate by type for the month
  const monthByType: Record<string, number> = {};
  data.forEach((d) => {
    Object.entries(d.byType).forEach(([type, count]) => {
      monthByType[type] = (monthByType[type] || 0) + count;
    });
  });

  const todayStr = now.toISOString().split("T")[0];

  const handleMouseEnter = (e: React.MouseEvent, day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayData = dataMap.get(dateStr);
    if (dayData && dayData.total > 0) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
      setHoveredDay(dayData);
    }
  };

  const handleMouseLeave = () => {
    setHoveredDay(null);
  };

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPrevMonth}
            className="rounded-lg p-2 text-gray-400 hover:bg-[#792990]/20 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h3 className="text-lg font-semibold text-white capitalize min-w-[180px] text-center">
            {monthLabel}
          </h3>
          <button
            onClick={goToNextMonth}
            className="rounded-lg p-2 text-gray-400 hover:bg-[#792990]/20 hover:text-white transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="rounded-lg border border-[#792990]/40 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-[#792990]/20 hover:text-white transition-colors"
        >
          Hoje
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <div className="rounded-lg bg-[#2d1b3d] p-3 text-center">
          <p className="text-2xl font-bold text-white">{monthTotal}</p>
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Total</p>
        </div>
        <div className="rounded-lg bg-[#2d1b3d] p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{monthCompleted}</p>
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Concluidas</p>
        </div>
        <div className="rounded-lg bg-[#2d1b3d] p-3 text-center">
          <p className="text-2xl font-bold text-yellow-400">{monthPending}</p>
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Pendentes</p>
        </div>
        <div className="rounded-lg bg-[#2d1b3d] p-3 text-center">
          <p className="text-2xl font-bold text-red-400">{monthFailed}</p>
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Falharam</p>
        </div>
        <div className="rounded-lg bg-[#2d1b3d] p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{monthSkipped}</p>
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Puladas</p>
        </div>
        <div className="rounded-lg bg-[#2d1b3d] p-3 text-center">
          <p className="text-2xl font-bold text-[#b84fd1]">{avgPerDay}</p>
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Media/dia</p>
        </div>
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#792990]" />
        </div>
      ) : (
        <div className="relative">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} className="aspect-square" />;
              }

              const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayData = dataMap.get(dateStr);
              const total = dayData?.total || 0;
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={dateStr}
                  onMouseEnter={(e) => handleMouseEnter(e, day)}
                  onMouseLeave={handleMouseLeave}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center cursor-default transition-all duration-150 relative ${getIntensityClass(total)} ${
                    isToday ? "ring-2 ring-white/50" : ""
                  } ${total > 0 ? "hover:ring-2 hover:ring-[#b84fd1]/60 hover:scale-105" : ""}`}
                >
                  <span className={`text-sm font-medium ${isToday ? "text-white" : total > 0 ? "text-gray-100" : "text-gray-500"}`}>
                    {day}
                  </span>
                  {total > 0 && (
                    <span className="text-[10px] font-bold text-white/80">
                      {total}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 justify-end">
            <span className="text-xs text-gray-500">Menos</span>
            <div className="w-4 h-4 rounded bg-[#2d1b3d]" />
            <div className="w-4 h-4 rounded bg-[#792990]/30" />
            <div className="w-4 h-4 rounded bg-[#792990]/50" />
            <div className="w-4 h-4 rounded bg-[#792990]/70" />
            <div className="w-4 h-4 rounded bg-[#792990]" />
            <span className="text-xs text-gray-500">Mais</span>
          </div>

          {/* Tooltip */}
          {hoveredDay && (
            <div
              className="fixed z-50 pointer-events-none"
              style={{
                left: tooltipPos.x,
                top: tooltipPos.y - 8,
                transform: "translate(-50%, -100%)",
              }}
            >
              <div className="rounded-xl bg-[#0d0012] border border-[#792990] shadow-2xl p-4 min-w-[220px]">
                <p className="text-sm font-semibold text-white mb-2">
                  {new Date(hoveredDay.date + "T12:00:00").toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">Total</span>
                    <span className="text-xs font-bold text-white">{hoveredDay.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-green-400">Concluidas</span>
                    <span className="text-xs font-bold text-green-400">{hoveredDay.completed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-yellow-400">Pendentes</span>
                    <span className="text-xs font-bold text-yellow-400">{hoveredDay.pending}</span>
                  </div>
                  {hoveredDay.failed > 0 && (
                    <div className="flex justify-between">
                      <span className="text-xs text-red-400">Falharam</span>
                      <span className="text-xs font-bold text-red-400">{hoveredDay.failed}</span>
                    </div>
                  )}
                  {hoveredDay.skipped > 0 && (
                    <div className="flex justify-between">
                      <span className="text-xs text-amber-400">Puladas</span>
                      <span className="text-xs font-bold text-amber-400">{hoveredDay.skipped}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#792990]/30 pt-2 space-y-2">
                  {hoveredDay.completed > 0 && Object.keys(hoveredDay.completedByType || {}).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-green-400/70 font-medium">Concluidas</p>
                      {Object.entries(hoveredDay.completedByType)
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: activityTypeLabels[type]?.color || "#888" }}
                              />
                              <span className="text-xs text-gray-300">
                                {activityTypeLabels[type]?.label || type}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-green-400">{count}</span>
                          </div>
                        ))}
                    </div>
                  )}
                  {hoveredDay.pending > 0 && Object.keys(hoveredDay.pendingByType || {}).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-yellow-400/70 font-medium">Pendentes</p>
                      {Object.entries(hoveredDay.pendingByType)
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: activityTypeLabels[type]?.color || "#888" }}
                              />
                              <span className="text-xs text-gray-300">
                                {activityTypeLabels[type]?.label || type}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-yellow-400">{count}</span>
                          </div>
                        ))}
                    </div>
                  )}
                  {hoveredDay.failed > 0 && Object.keys(hoveredDay.failedByType || {}).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-red-400/70 font-medium">Falharam</p>
                      {Object.entries(hoveredDay.failedByType)
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: activityTypeLabels[type]?.color || "#888" }}
                              />
                              <span className="text-xs text-gray-300">
                                {activityTypeLabels[type]?.label || type}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-red-400">{count}</span>
                          </div>
                        ))}
                    </div>
                  )}
                  {hoveredDay.skipped > 0 && Object.keys(hoveredDay.skippedByType || {}).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-amber-400/70 font-medium">Puladas</p>
                      {Object.entries(hoveredDay.skippedByType)
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: activityTypeLabels[type]?.color || "#888" }}
                              />
                              <span className="text-xs text-gray-300">
                                {activityTypeLabels[type]?.label || type}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-amber-400">{count}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Type breakdown for the month */}
      {Object.keys(monthByType).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-3">Distribuicao por tipo no mes</h4>
          <div className="flex gap-1 h-6 rounded-lg overflow-hidden">
            {Object.entries(monthByType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => {
                const pct = (count / monthTotal) * 100;
                return (
                  <div
                    key={type}
                    className="h-full transition-all duration-300 first:rounded-l-lg last:rounded-r-lg relative group"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: activityTypeLabels[type]?.color || "#888",
                      minWidth: pct > 3 ? undefined : "4px",
                    }}
                    title={`${activityTypeLabels[type]?.label || type}: ${count} (${pct.toFixed(0)}%)`}
                  />
                );
              })}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {Object.entries(monthByType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: activityTypeLabels[type]?.color || "#888" }}
                  />
                  <span className="text-xs text-gray-400">
                    {activityTypeLabels[type]?.label || type}
                  </span>
                  <span className="text-xs font-semibold text-gray-300">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
