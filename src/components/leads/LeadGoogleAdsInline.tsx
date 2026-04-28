"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

interface Props {
  leadId: string;
  existing?: string | null;
}

export function LeadGoogleAdsInline({ leadId, existing }: Props) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save(value: string) {
    setSaving(true);
    try {
      await apiFetch(`/leads/${leadId}`, token, {
        method: "PATCH",
        body: JSON.stringify({ googleAds: value }),
      });
      router.refresh();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400">Google Ads?</span>
        <button onClick={() => save("Sim")} disabled={saving}
          className="rounded bg-green-800/60 border border-green-700 px-2 py-0.5 text-xs text-green-300 hover:bg-green-700/60 disabled:opacity-50">
          Sim
        </button>
        <button onClick={() => save("Não")} disabled={saving}
          className="rounded bg-gray-800 border border-gray-700 px-2 py-0.5 text-xs text-gray-400 hover:bg-gray-700 disabled:opacity-50">
          Não
        </button>
        <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-gray-300">✕</button>
      </div>
    );
  }

  if (existing) {
    return (
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${existing === "Sim" ? "text-green-400" : "text-gray-400"}`}>
          {existing}
        </span>
        <button onClick={() => setEditing(true)} className="text-xs text-gray-500 hover:text-gray-300" title="Atualizar">↺</button>
      </div>
    );
  }

  return (
    <button onClick={() => setEditing(true)} className="text-xs text-gray-500 hover:text-purple-400 underline underline-offset-2">
      Marcar resultado
    </button>
  );
}
