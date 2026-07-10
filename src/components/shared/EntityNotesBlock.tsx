"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { Pencil, Check, X, StickyNote } from "lucide-react";

type Props = {
  /** PATCH endpoint that accepts `{ notes }` (e.g. `/partners/<id>` or `/leads/<id>`). */
  patchUrl: string;
  initialNotes: string | null | undefined;
  /** Word for the empty-state hint, e.g. "parceiro", "lead". */
  entityLabel?: string;
  /** Card title. Defaults to "Observações Internas"; leads use "Notas". */
  title?: string;
};

/**
 * Inline-editable notes card, shared by any entity whose PATCH endpoint accepts
 * `{ notes }`. Mirrors the lead's notes UX so partner/lead/organization render
 * identically.
 */
export function EntityNotesBlock({
  patchUrl,
  initialNotes,
  entityLabel = "registro",
  title = "Observações Internas",
}: Props) {
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
      await apiFetch(patchUrl, token, {
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
    <div className="rounded-xl border border-amber-400/70 bg-white shadow-sm">
      <div className="flex items-center justify-between rounded-t-xl border-b border-amber-300/50 bg-amber-50 px-4 py-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
          <StickyNote size={14} />
          {title}
        </span>
        {!editing && (
          <button
            onClick={startEdit}
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-200/60"
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
              className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2.5 py-0.5 text-xs font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
            >
              <Check size={11} />
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-md border border-amber-400 px-2.5 py-0.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
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
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{notes}</p>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="cursor-pointer text-left text-sm italic text-gray-400 hover:text-amber-600"
          >
            Clique em Editar para adicionar notas sobre este {entityLabel}...
          </button>
        )}
      </div>
    </div>
  );
}
