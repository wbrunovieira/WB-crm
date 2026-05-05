"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { Pencil, Check, X, StickyNote } from "lucide-react";

type Props = {
  leadId: string;
  initialNotes: string | null | undefined;
};

export function LeadNotesBlock({ leadId, initialNotes }: Props) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(notes);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function startEdit() {
    setDraft(notes);
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(notes);
  }

  async function saveNotes() {
    setSaving(true);
    try {
      await apiFetch(`/leads/${leadId}`, token, {
        method: "PATCH",
        body: JSON.stringify({ notes: draft || null }),
      });
      setNotes(draft);
      setEditing(false);
      toast.success("Notas salvas");
    } catch {
      toast.error("Erro ao salvar notas");
    } finally {
      setSaving(false);
    }
  }

  const hasNotes = notes.trim().length > 0;

  return (
    <div className="mb-5 rounded-xl border border-amber-400/70 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b border-amber-300/50 bg-amber-50 rounded-t-xl">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
          <StickyNote size={14} />
          Notas
        </span>
        {!editing && (
          <button
            onClick={startEdit}
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-200/60 transition-colors"
          >
            <Pencil size={11} />
            Editar
          </button>
        )}
        {editing && (
          <div className="flex gap-1">
            <button
              onClick={saveNotes}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2.5 py-0.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              <Check size={11} />
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-md border border-amber-400 px-2.5 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
            >
              <X size={11} />
              Cancelar
            </button>
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        {editing ? (
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            placeholder="Escreva suas notas aqui..."
            className="w-full resize-y rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        ) : hasNotes ? (
          <p className="whitespace-pre-wrap text-sm text-gray-400 leading-relaxed">{notes}</p>
        ) : (
          <p className="text-sm text-gray-400 italic cursor-pointer hover:text-amber-600" onClick={startEdit}>
            Clique em Editar para adicionar notas sobre este lead...
          </p>
        )}
      </div>
    </div>
  );
}
