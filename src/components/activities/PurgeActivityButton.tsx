"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

export default function PurgeActivityButton({ activityId, onPurged }: { activityId: string; onPurged?: () => void }) {
  const { data: session } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const token = (session?.user as any)?.accessToken ?? "";

  if (session?.user?.role !== "admin") return null;

  async function handlePurge() {
    setLoading(true);
    try {
      await apiFetch(`/activities/${activityId}/purge`, token, { method: "DELETE" });
      toast.success("Atividade excluída permanentemente.");
      onPurged?.();
    } catch {
      toast.error("Erro ao excluir atividade");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1 text-xs">
        <button
          onClick={handlePurge}
          disabled={loading}
          className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
        >
          {loading ? "..." : "Confirmar"}
        </button>
        <button onClick={() => setConfirming(false)} className="text-gray-500 hover:text-gray-700">
          Cancelar
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-gray-400 hover:text-red-600"
      title="Excluir permanentemente (admin)"
    >
      <Trash2 size={15} />
    </button>
  );
}
