"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GoogleDisconnectButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDisconnect() {
    if (!confirm("Deseja desconectar a conta Google? Funcionalidades de e-mail e Drive serão desativadas.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/google/disconnect", { method: "POST" });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDisconnect}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      {loading ? "Desconectando..." : "Desconectar conta"}
    </button>
  );
}
