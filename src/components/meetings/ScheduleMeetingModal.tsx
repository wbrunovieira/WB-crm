"use client";

import { useState } from "react";
import { X, Video, Plus, Trash2, Loader2 } from "lucide-react";
import { scheduleMeeting } from "@/actions/meetings";
import { toast } from "sonner";

interface Props {
  leadId?: string;
  contactId?: string;
  dealId?: string;
  /** Pre-filled attendee emails from lead contacts */
  defaultEmails?: string[];
  onClose: () => void;
  onCreated: () => void;
}

export default function ScheduleMeetingModal({
  leadId,
  contactId,
  dealId,
  defaultEmails = [],
  onClose,
  onCreated,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [emails, setEmails] = useState<string[]>(defaultEmails.length > 0 ? defaultEmails : [""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addEmail() {
    setEmails((prev) => [...prev, ""]);
  }

  function removeEmail(idx: number) {
    setEmails((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateEmail(idx: number, value: string) {
    setEmails((prev) => prev.map((e, i) => (i === idx ? value : e)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Título é obrigatório");
      return;
    }
    if (!startDate || !startTime) {
      setError("Data e hora de início são obrigatórios");
      return;
    }

    const startAt = new Date(`${startDate}T${startTime}:00`);
    if (isNaN(startAt.getTime())) {
      setError("Data/hora inválida");
      return;
    }

    const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
    const attendeeEmails = emails.filter((e) => e.trim().length > 0);

    setLoading(true);
    try {
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
      onCreated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao agendar reunião";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Video size={18} className="text-purple-600" />
            <h2 className="text-base font-semibold text-gray-900">Agendar Reunião</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
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

          {/* Attendees */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Convidados (e-mails)
            </label>
            <div className="space-y-2">
              {emails.map((email, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => updateEmail(idx, e.target.value)}
                    placeholder="convidado@empresa.com"
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                  />
                  {emails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmail(idx)}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addEmail}
                className="flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700"
              >
                <Plus size={13} />
                Adicionar convidado
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
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
                  Agendar Reunião
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
