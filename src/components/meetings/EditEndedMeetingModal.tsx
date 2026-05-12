"use client";

import { useState } from "react";
import { X, Loader2, Check } from "lucide-react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

interface Props {
  meetingId: string;
  title: string;
  startAt: Date | string;
  endAt: Date | string | null;
  actualStartAt: Date | string | null;
  actualEndAt: Date | string | null;
  onClose: () => void;
  onSaved: (updated: { title: string; actualStartAt: string | null; actualEndAt: string | null }) => void;
}

function toDatetimeLocal(d: Date | string | null): string {
  if (!d) return "";
  const date = new Date(d);
  // Format as YYYY-MM-DDTHH:MM in local (America/São Paulo) — browser datetime-local uses system TZ
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}T${pad(date.getMinutes())}`.replace(/T(\d{2})T/, "T$1:");
}

function toISO(datetimeLocal: string): string | null {
  if (!datetimeLocal) return null;
  return new Date(datetimeLocal).toISOString();
}

export function EditEndedMeetingModal({
  meetingId,
  title: initialTitle,
  actualStartAt,
  actualEndAt,
  onClose,
  onSaved,
}: Props) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";

  const [title, setTitle] = useState(initialTitle);
  const [actStart, setActStart] = useState(toDatetimeLocal(actualStartAt));
  const [actEnd, setActEnd] = useState(toDatetimeLocal(actualEndAt));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!actEnd) {
      toast.error("Informe a data e hora de encerramento.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/meetings/${meetingId}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim() || undefined,
          actualStartAt: toISO(actStart) ?? undefined,
          actualEndAt: toISO(actEnd),
        }),
      });
      toast.success("Reunião atualizada.");
      onSaved({
        title: title.trim(),
        actualStartAt: toISO(actStart),
        actualEndAt: toISO(actEnd),
      });
      onClose();
    } catch {
      toast.error("Erro ao salvar alterações.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-[#3d2b4d] bg-[#1a0022] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#3d2b4d] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Editar Reunião Concluída</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Data/hora de início real</label>
            <input
              type="datetime-local"
              value={actStart}
              onChange={(e) => setActStart(e.target.value)}
              className="w-full rounded-lg border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">
              Data/hora de encerramento real <span className="text-red-400">*</span>
            </label>
            <input
              type="datetime-local"
              value={actEnd}
              onChange={(e) => setActEnd(e.target.value)}
              className="w-full rounded-lg border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none [color-scheme:dark]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#3d2b4d] px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !actEnd}
            className="flex items-center gap-1.5 rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
