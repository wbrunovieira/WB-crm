"use client";

import { useState } from "react";
import { X, Video, Plus, Trash2, Loader2, UserCheck, User } from "lucide-react";
import { scheduleMeeting, updateMeeting } from "@/actions/meetings";
import { toast } from "sonner";

export interface SuggestedContact {
  id: string;
  name: string;
  email: string;
  role?: string | null;
}

export interface MeetingInitialData {
  title: string;
  description?: string;
  startAt: Date;
  endAt: Date | null;
  attendeeEmails: string; // JSON string [{email, responseStatus}] or string[]
}

interface Props {
  leadId?: string;
  contactId?: string;
  dealId?: string;
  /** Contacts from the lead/deal to show as clickable chips */
  suggestedContacts?: SuggestedContact[];
  /** When provided, switches modal to edit mode */
  meetingId?: string;
  initialData?: MeetingInitialData;
  onClose: () => void;
  onCreated: () => void;
}

function parseInitialEmails(
  initialData: MeetingInitialData | undefined,
  suggestedContacts: SuggestedContact[]
): string[] {
  if (!initialData) return [""];
  try {
    const parsed = JSON.parse(initialData.attendeeEmails);
    const emails: string[] = Array.isArray(parsed)
      ? parsed.map((a: unknown) => (typeof a === "string" ? a : (a as { email: string }).email))
      : [];
    // Remove emails that match suggested contacts (those go to chips)
    const suggestedEmails = new Set(suggestedContacts.map((c) => c.email));
    const custom = emails.filter((e) => !suggestedEmails.has(e));
    return custom.length > 0 ? custom : [""];
  } catch {
    return [""];
  }
}

function toDateTimeInputs(date: Date): { date: string; time: string } {
  const d = new Date(date);
  const datePart = d.toISOString().split("T")[0];
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return { date: datePart, time: `${hours}:${minutes}` };
}

export default function ScheduleMeetingModal({
  leadId,
  contactId,
  dealId,
  suggestedContacts = [],
  meetingId,
  initialData,
  onClose,
  onCreated,
}: Props) {
  const isEditMode = !!meetingId;

  // Pre-fill from initialData when editing
  const initialStart = initialData ? toDateTimeInputs(new Date(initialData.startAt)) : null;
  const initialDuration =
    initialData && initialData.endAt
      ? Math.round((new Date(initialData.endAt).getTime() - new Date(initialData.startAt).getTime()) / 60000)
      : 60;

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [startDate, setStartDate] = useState(initialStart?.date ?? "");
  const [startTime, setStartTime] = useState(initialStart?.time ?? "");
  const [durationMinutes, setDurationMinutes] = useState(
    [30, 60, 90, 120].includes(initialDuration) ? initialDuration : 60
  );

  // Selected contact IDs — pre-select contacts whose emails appear in initialData (edit) or all (new)
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(() => {
    if (!initialData) return new Set(suggestedContacts.map((c) => c.id));
    try {
      const parsed = JSON.parse(initialData.attendeeEmails);
      const emails = new Set<string>(
        Array.isArray(parsed)
          ? parsed.map((a: unknown) => (typeof a === "string" ? a : (a as { email: string }).email))
          : []
      );
      return new Set(suggestedContacts.filter((c) => emails.has(c.email)).map((c) => c.id));
    } catch {
      return new Set(suggestedContacts.map((c) => c.id));
    }
  });

  // Free-form email inputs (for anyone not in suggestedContacts)
  const [customEmails, setCustomEmails] = useState<string[]>(
    parseInitialEmails(initialData, suggestedContacts)
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleContact(id: string) {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function addCustomEmail() {
    setCustomEmails((prev) => [...prev, ""]);
  }

  function removeCustomEmail(idx: number) {
    setCustomEmails((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateCustomEmail(idx: number, value: string) {
    setCustomEmails((prev) => prev.map((e, i) => (i === idx ? value : e)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) { setError("Título é obrigatório"); return; }
    if (!startDate || !startTime) { setError("Data e hora de início são obrigatórios"); return; }

    const startAt = new Date(`${startDate}T${startTime}:00`);
    if (isNaN(startAt.getTime())) { setError("Data/hora inválida"); return; }

    const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);

    // Merge: selected contact emails + non-empty custom emails (deduplicated)
    const contactEmails = suggestedContacts
      .filter((c) => selectedContactIds.has(c.id))
      .map((c) => c.email);
    const freeEmails = customEmails.map((e) => e.trim()).filter(Boolean);
    const seen = new Set<string>();
    const attendeeEmails = [...contactEmails, ...freeEmails].filter((e) => {
      if (seen.has(e)) return false;
      seen.add(e);
      return true;
    });

    setLoading(true);
    try {
      if (isEditMode && meetingId) {
        await updateMeeting(meetingId, {
          title: title.trim(),
          description: description.trim() || undefined,
          startAt,
          endAt,
          attendeeEmails,
        });
        toast.success("Reunião atualizada! Os convidados foram notificados.");
      } else {
        await scheduleMeeting({
          title: title.trim(),
          description: description.trim() || undefined,
          startAt,
          endAt,
          attendeeEmails,
          leadId,
          contactId,
          dealId,
        });
        toast.success("Reunião agendada! Convite enviado por e-mail.");
      }
      onCreated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar reunião";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const selectedCount = selectedContactIds.size + customEmails.filter((e) => e.trim()).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Video size={18} className="text-purple-600" />
            <h2 className="text-base font-semibold text-gray-900">
              {isEditMode ? "Editar Reunião" : "Agendar Reunião"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form (scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="space-y-4 px-6 py-5">
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            {/* Title */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Apresentação da proposta"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Data <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Hora <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Duração</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              >
                <option value={30}>30 minutos</option>
                <option value={60}>1 hora</option>
                <option value={90}>1h30</option>
                <option value={120}>2 horas</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Descrição (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Pauta da reunião..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* ── Attendees ────────────────────────────────────── */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Convidados
                  {selectedCount > 0 && (
                    <span className="ml-1.5 rounded-full bg-purple-100 px-1.5 py-0.5 text-xs font-semibold text-purple-700">
                      {selectedCount}
                    </span>
                  )}
                </label>
              </div>

              {/* Suggested contacts panel */}
              {suggestedContacts.length > 0 && (
                <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Contatos do lead
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedContacts.map((c) => {
                      const selected = selectedContactIds.has(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleContact(c.id)}
                          title={c.email}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                            selected
                              ? "border-purple-400 bg-purple-100 text-purple-800"
                              : "border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50"
                          }`}
                        >
                          {selected ? (
                            <UserCheck size={12} className="text-purple-600" />
                          ) : (
                            <User size={12} className="text-gray-400" />
                          )}
                          <span className="max-w-[120px] truncate">{c.name}</span>
                          {c.role && (
                            <span className="opacity-60">· {c.role}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {/* Show emails of selected contacts */}
                  {selectedContactIds.size > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {suggestedContacts
                        .filter((c) => selectedContactIds.has(c.id))
                        .map((c) => (
                          <span
                            key={c.id}
                            className="inline-block rounded bg-purple-50 px-1.5 py-0.5 text-xs text-purple-600"
                          >
                            {c.email}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Custom email inputs */}
              <div className="space-y-2">
                {customEmails.map((email, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => updateCustomEmail(idx, e.target.value)}
                      placeholder="outro@empresa.com"
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                    />
                    {customEmails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCustomEmail(idx)}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addCustomEmail}
                  className="flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700"
                >
                  <Plus size={13} />
                  Adicionar outro e-mail
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Agendando...
                </>
              ) : (
                <>
                  <Video size={14} />
                  {isEditMode ? "Salvar Alterações" : "Agendar Reunião"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
