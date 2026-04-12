"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function GoogleDisconnectButton() {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  async function handleDisconnect() {
    setLoading(true);
    setConfirming(false);
    try {
      const res = await fetch("/api/google/disconnect", { method: "POST" });
      if (res.ok) {
        toast.success("Conta Google desconectada.");
        router.refresh();
      } else {
        toast.error("Erro ao desconectar conta Google.");
      }
    } catch {
      toast.error("Erro ao desconectar conta Google.");
    } finally {
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
        <span className="text-sm text-red-700 font-medium">Desconectar e-mail e Drive?</span>
        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="rounded bg-red-500 px-2 py-0.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
        >
          {loading ? "..." : "Sim"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded px-2 py-0.5 text-xs font-medium text-red-500 hover:bg-red-100"
        >
          Não
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
    >
      Desconectar conta
    </button>
  );
}
