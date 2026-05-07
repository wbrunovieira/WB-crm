"use client";

import { useState } from "react";
import { Phone, PhoneMissed, Voicemail, UserCheck, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { TodayCallStats } from "@/app/(dashboard)/calls/page";

type Props = {
  dailyStats: Record<string, TodayCallStats>;
  todayDate: string; // YYYY-MM-DD
};

function formatDate(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return "Hoje";
  const yesterday = new Date(new Date(todayStr + "T12:00:00.000Z").getTime() - 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  if (dateStr === yesterday) return "Ontem";
  const d = new Date(dateStr + "T00:00:00.000Z");
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

function Delta({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (diff === 0) return <span className="text-xs text-gray-500 flex items-center gap-0.5"><Minus className="h-3 w-3" />0</span>;
  if (diff > 0) return <span className="text-xs text-green-400 flex items-center gap-0.5"><TrendingUp className="h-3 w-3" />+{diff}</span>;
  return <span className="text-xs text-red-400 flex items-center gap-0.5"><TrendingDown className="h-3 w-3" />{diff}</span>;
}

export function TodaySummary({ dailyStats, todayDate }: Props) {
  const sortedDates = Object.keys(dailyStats).sort();
  const [selectedDate, setSelectedDate] = useState(todayDate);

  const selectedIdx = sortedDates.indexOf(selectedDate);
  const canPrev = selectedIdx > 0;
  const canNext = selectedIdx < sortedDates.length - 1 && sortedDates[selectedIdx + 1] <= todayDate;

  const stats = dailyStats[selectedDate] ?? { total: 0, answered: 0, noAnswer: 0, voicemail: 0, busy: 0, decisor: 0 };
  const prevDate = canPrev ? sortedDates[selectedIdx - 1] : null;
  const prevStats = prevDate ? dailyStats[prevDate] : null;

  const noAnswerVal = stats.noAnswer + stats.busy + stats.voicemail;
  const noAnswerPrev = prevStats ? prevStats.noAnswer + prevStats.busy + prevStats.voicemail : undefined;

  const items = [
    { icon: Phone,       label: "Ligações",    value: stats.total,   prev: prevStats?.total,   color: "text-purple-300", border: "#792990", bg: "rgba(121,41,144,0.15)" },
    { icon: Phone,       label: "Atendidas",   value: stats.answered, prev: prevStats?.answered, color: "text-green-400",  border: "#16a34a", bg: "rgba(34,197,94,0.1)" },
    { icon: PhoneMissed, label: "Não atendeu", value: noAnswerVal,   prev: noAnswerPrev,        color: "text-red-400",   border: "#dc2626", bg: "rgba(239,68,68,0.1)" },
    { icon: Voicemail,   label: "Caixa postal", value: stats.voicemail, prev: prevStats?.voicemail, color: "text-yellow-400", border: "#ca8a04", bg: "rgba(234,179,8,0.1)" },
    { icon: UserCheck,   label: "Decisor",     value: stats.decisor, prev: prevStats?.decisor,  color: "text-blue-400",  border: "#2563eb", bg: "rgba(59,130,246,0.1)" },
  ];

  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: "#1a0022", borderColor: "#792990" }}>
      {/* Header with chevron navigation */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">
          {formatDate(selectedDate, todayDate)}
        </h3>
        <div className="flex items-center gap-1">
          {prevStats && (
            <span className="text-xs text-gray-500 mr-2">
              vs {formatDate(sortedDates[selectedIdx - 1], todayDate)}: {prevStats.total} lig.
            </span>
          )}
          <button
            onClick={() => canPrev && setSelectedDate(sortedDates[selectedIdx - 1])}
            disabled={!canPrev}
            className="rounded p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Dia anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => canNext && setSelectedDate(sortedDates[selectedIdx + 1])}
            disabled={!canNext}
            className="rounded p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Próximo dia"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {stats.total === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">Nenhuma ligação registrada</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {items.map(({ icon: Icon, label, value, prev, color, border, bg }) => {
            const pct = label === "Ligações" ? null : stats.total > 0 ? Math.round((value / stats.total) * 100) : 0;
            return (
              <div
                key={label}
                className="rounded-lg p-3 border flex flex-col items-center gap-1"
                style={{ backgroundColor: bg, borderColor: border }}
              >
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-2xl font-bold text-white leading-none">{value}</span>
                {pct !== null && (
                  <span className={`text-xs font-semibold ${color}`}>{pct}%</span>
                )}
                <span className="text-xs text-gray-400 text-center leading-tight">{label}</span>
                {prev !== undefined && (
                  <Delta current={value} previous={prev} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
