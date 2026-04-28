"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BrainCircuit, X, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface ActiveSession {
  sessionId: string;
  total: number;
  completed: number;
  status: string;
}

export function BulkResearchProgressBanner() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const router = useRouter();
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchSession() {
    if (!token) return;
    try {
      const data = await apiFetch<ActiveSession | { active: false }>("/leads/bulk-deep-research/active", token);
      if ("active" in data && data.active === false) {
        setActiveSession(null);
        // keep polling — user may start a bulk session at any time
        return;
      }
      const s = data as ActiveSession;
      setActiveSession(s);
      if (s.status !== "running") {
        // session completed or cancelled — stop polling and refresh
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        router.refresh();
      }
    } catch (err) {
      console.error("[BulkResearchBanner] fetch error:", err);
    }
  }

  useEffect(() => {
    if (!token) return;
    void fetchSession();
    pollRef.current = setInterval(() => void fetchSession(), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleCancel() {
    if (!token) return;
    try {
      await apiFetch("/leads/bulk-deep-research/active", token, { method: "DELETE" });
      setActiveSession(null);
    } catch { /* ignore */ }
  }

  if (!activeSession || activeSession.status !== "running") return null;

  const pct = activeSession.total > 0 ? Math.round((activeSession.completed / activeSession.total) * 100) : 0;

  return (
    <div className="mb-4 flex items-center gap-4 rounded-lg bg-purple-50 border border-purple-200 px-4 py-3">
      <Loader2 className="h-4 w-4 text-purple-600 animate-spin flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-purple-800 flex items-center gap-1.5">
            <BrainCircuit className="h-3.5 w-3.5" />
            Pesquisa IA em lote em andamento
          </span>
          <span className="text-xs font-semibold text-purple-700">
            {activeSession.completed} de {activeSession.total} concluídos
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-purple-200">
          <div
            className="h-1.5 rounded-full bg-purple-600 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <button
        onClick={handleCancel}
        className="flex-shrink-0 text-purple-400 hover:text-purple-700"
        title="Cancelar pesquisa em lote"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
