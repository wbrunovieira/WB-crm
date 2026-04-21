"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { computeGoalBreakdown, type GoalBreakdown } from "@/lib/funnel/computeGoalBreakdown";
import { Target, Phone, Users, UserCheck, Calendar, CheckCircle2, TrendingUp } from "lucide-react";

type Props = {
  weekStart: string; // YYYY-MM-DD
  initialTargetSales: number;
  onBreakdownChange: (breakdown: GoalBreakdown) => void;
};

const ROWS = [
  { key: "requiredCalls",              label: "Ligações necessárias",        icon: Phone },
  { key: "requiredConnections",        label: "Conexões (> 1 min)",           icon: Users },
  { key: "requiredDecisorConnections", label: "Conexões c/ Decisor",          icon: UserCheck },
  { key: "requiredMeetingsScheduled",  label: "Reuniões para marcar",         icon: Calendar },
  { key: "requiredMeetingsHeld",       label: "Reuniões para realizar",       icon: CheckCircle2 },
] as const;

export function GoalSetter({ weekStart, initialTargetSales, onBreakdownChange }: Props) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [targetSales, setTargetSales] = useState(initialTargetSales);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const breakdown = computeGoalBreakdown(targetSales);

  useEffect(() => {
    onBreakdownChange(breakdown);
  }, [targetSales]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (value: number) => {
    setTargetSales(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await apiFetch("/funnel/goals", token, {
          method: "POST",
          body: JSON.stringify({ weekStart, targetSales: value }),
        });
      } catch {
        // silently ignore save errors
      } finally {
        setSaving(false);
      }
    }, 600);
  };

  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: "#1a0022", borderColor: "#792990" }}>
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-purple-400" />
        <h3 className="text-sm font-semibold text-white">Meta semanal de vendas</h3>
        {saving && <span className="text-xs text-gray-500 ml-auto">Salvando...</span>}
      </div>

      {/* Target sales input */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-400" />
          <span className="text-sm text-gray-400">Vendas que quero fechar esta semana</span>
        </div>
        <input
          type="number"
          min={0}
          max={100}
          value={targetSales}
          onChange={(e) => handleChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="w-20 rounded-lg border px-3 py-1.5 text-center text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          style={{ backgroundColor: "#350045", borderColor: "#792990" }}
        />
      </div>

      {/* Backwards breakdown */}
      {targetSales > 0 && (
        <div className="space-y-2 pt-2 border-t" style={{ borderColor: "#2a0033" }}>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Para atingir {targetSales} venda{targetSales !== 1 ? "s" : ""}, você precisa de:</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {ROWS.map(({ key, label, icon: Icon }) => (
              <div
                key={key}
                className="rounded-lg p-3 text-center"
                style={{ backgroundColor: "#2a0033" }}
              >
                <Icon className="h-4 w-4 text-purple-400 mx-auto mb-1" />
                <div className="text-xl font-bold text-white">{breakdown[key]}</div>
                <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
