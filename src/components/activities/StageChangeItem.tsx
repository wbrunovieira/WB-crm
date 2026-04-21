"use client";

import { useState } from "react";
import { ArrowRight, Pencil, Check, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { StageChange } from "./ActivityTimeline";

export function StageChangeItem({ stageChange }: { stageChange: StageChange }) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dateValue, setDateValue] = useState(() => {
    const d = new Date(stageChange.changedAt);
    return d.toISOString().slice(0, 16);
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch(`/deals/stage-history/${stageChange.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ changedAt: new Date(dateValue).toISOString() }),
      });
      setEditing(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar data");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    const d = new Date(stageChange.changedAt);
    setDateValue(d.toISOString().slice(0, 16));
    setEditing(false);
  };

  return (
    <div className="relative flex items-start space-x-3">
      <div className="relative">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 ring-8 ring-white">
          <ArrowRight className="h-5 w-5 text-blue-600" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900">
            Mudança de estágio
          </span>
          <div className="inline-flex items-center gap-1.5 text-sm">
            {stageChange.fromStage ? (
              <>
                <span className="rounded-full bg-gray-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {stageChange.fromStage.name}
                </span>
                <ArrowRight className="h-3 w-3 text-gray-400" />
              </>
            ) : null}
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
              {stageChange.toStage.name}
            </span>
          </div>
        </div>

        <div className="mt-0.5 flex items-center gap-1.5">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input
                type="datetime-local"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                disabled={saving}
                className="rounded border border-gray-300 px-2 py-0.5 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-50"
                title="Salvar"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="rounded p-1 text-gray-400 hover:bg-gray-100"
                title="Cancelar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500">
                {formatDate(stageChange.changedAt)}
                <span className="ml-2">
                  • por {stageChange.changedBy.name || stageChange.changedBy.email}
                </span>
              </p>
              <button
                onClick={() => setEditing(true)}
                className="rounded p-1 text-gray-300 hover:text-gray-500 hover:bg-gray-100"
                title="Editar data"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
