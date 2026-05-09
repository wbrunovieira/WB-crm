"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { type PeriodOption } from "@/lib/validations/manager";

const periodButtons: { value: PeriodOption; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "custom", label: "Personalizado" },
];

function getWeekLabel(offset: number): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff + offset * 7));
  const friday = new Date(monday.getTime() + 4 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  return `${fmt(monday)} – ${fmt(friday)}`;
}

function getDayLabel(offset: number): string {
  const now = new Date();
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset));
  if (offset === 0) return `Hoje, ${target.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" })}`;
  if (offset === -1) return `Ontem, ${target.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" })}`;
  return target.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

interface DateRangePickerProps {
  currentPeriod: PeriodOption;
  startDate?: string;
  endDate?: string;
  weekOffset?: number;
  dayOffset?: number;
}

export function DateRangePicker({
  currentPeriod,
  startDate,
  endDate,
  weekOffset = 0,
  dayOffset = 0,
}: DateRangePickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCustom, setShowCustom] = useState(currentPeriod === "custom");
  const [customStart, setCustomStart] = useState(startDate || "");
  const [customEnd, setCustomEnd] = useState(endDate || "");

  const navigate = (params: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) p.set(k, v);
    }
    router.push(`/admin/manager?${p.toString()}`);
  };

  const handlePeriodChange = (period: PeriodOption) => {
    if (period === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    navigate({ period });
  };

  const handleCustomDateApply = () => {
    if (!customStart || !customEnd) return;
    navigate({ period: "custom", startDate: customStart, endDate: customEnd });
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      {/* Period Buttons */}
      <div className="flex flex-wrap gap-2">
        {periodButtons.map((button) => (
          <button
            key={button.value}
            onClick={() => handlePeriodChange(button.value)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              currentPeriod === button.value
                ? "bg-[#792990] text-white"
                : "bg-[#1a0022] text-gray-300 hover:bg-[#792990]/30 border border-[#792990]/30"
            )}
          >
            {button.label}
          </button>
        ))}
      </div>

      {/* Week navigation */}
      {currentPeriod === "week" && (
        <div className="flex items-center gap-1 bg-[#1a0022] border border-[#792990]/30 rounded-lg px-2 py-1">
          <button
            onClick={() => navigate({ period: "week", weekOffset: String(weekOffset - 1) })}
            className="p-1 text-gray-400 hover:text-white transition-colors rounded"
            title="Semana anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-300 min-w-[140px] text-center">
            {getWeekLabel(weekOffset)}
          </span>
          <button
            onClick={() => navigate({ period: "week", weekOffset: String(weekOffset + 1) })}
            disabled={weekOffset >= 0}
            className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
            title="Próxima semana"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Day navigation */}
      {currentPeriod === "today" && (
        <div className="flex items-center gap-1 bg-[#1a0022] border border-[#792990]/30 rounded-lg px-2 py-1">
          <button
            onClick={() => navigate({ period: "today", dayOffset: String(dayOffset - 1) })}
            className="p-1 text-gray-400 hover:text-white transition-colors rounded"
            title="Dia anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-300 min-w-[140px] text-center">
            {getDayLabel(dayOffset)}
          </span>
          <button
            onClick={() => navigate({ period: "today", dayOffset: String(dayOffset + 1) })}
            disabled={dayOffset >= 0}
            className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
            title="Próximo dia"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Custom Date Range */}
      {showCustom && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#1a0022] border border-[#792990]/30 text-white text-sm focus:outline-none focus:border-[#792990]"
            />
            <span className="text-gray-400">até</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#1a0022] border border-[#792990]/30 text-white text-sm focus:outline-none focus:border-[#792990]"
            />
          </div>
          <button
            onClick={handleCustomDateApply}
            disabled={!customStart || !customEnd}
            className="px-4 py-2 rounded-lg bg-[#792990] text-white text-sm font-medium hover:bg-[#792990]/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
