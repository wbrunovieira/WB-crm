"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { type PeriodOption } from "@/lib/validations/manager";

const periodButtons: { value: PeriodOption; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "custom", label: "Personalizado" },
];

interface DateRangePickerProps {
  currentPeriod: PeriodOption;
  startDate?: string;
  endDate?: string;
}

export function DateRangePicker({
  currentPeriod,
  startDate,
  endDate,
}: DateRangePickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCustom, setShowCustom] = useState(currentPeriod === "custom");
  const [customStart, setCustomStart] = useState(startDate || "");
  const [customEnd, setCustomEnd] = useState(endDate || "");

  const handlePeriodChange = (period: PeriodOption) => {
    if (period === "custom") {
      setShowCustom(true);
      return;
    }

    setShowCustom(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    params.delete("startDate");
    params.delete("endDate");
    router.push(`/admin/manager?${params.toString()}`);
  };

  const handleCustomDateApply = () => {
    if (!customStart || !customEnd) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("period", "custom");
    params.set("startDate", customStart);
    params.set("endDate", customEnd);
    router.push(`/admin/manager?${params.toString()}`);
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
