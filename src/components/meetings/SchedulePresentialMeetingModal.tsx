"use client";

import { useState } from "react";
import { X, MapPin, User, Phone, Mail, Calendar, Clock, Check, Loader2, ChevronDown } from "lucide-react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

export interface PresentialContact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  role?: string | null;
}

interface Props {
  leadId?: string;
  contactId?: string;
  organizationId?: string;
  dealId?: string;
  suggestedContacts?: PresentialContact[];
  defaultLocation?: string;
  onClose: () => void;
  onCreated: () => void;
}

type ReminderStep = "immediate" | "morning_reminder" | "one_hour_reminder" | "on_time_reminder";
type Channel = "email" | "whatsapp";

const REMINDER_LABELS: Record<ReminderStep, string> = {
  immediate: "Confirmação imediata (ao agendar)",
  morning_reminder: "Lembrete manhã do dia",
  one_hour_reminder: "Lembrete 1h antes",
  on_time_reminder: "Lembrete na hora",
};

function todayLocalIso() {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

function nextHourTime() {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  return `${String(now.getHours()).padStart(2, "0")}:00`;
}

export default function SchedulePresentialMeetingModal({
  leadId,
  contactId,
  organizationId,
  dealId,
  suggestedContacts = [],
  defaultLocation = "",
  onClose,
  onCreated,
}: Props) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayLocalIso());
  const [startTime, setStartTime] = useState(nextHourTime());
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState(defaultLocation);
  const [description, setDescription] = useState("");

  // Contact selection
  const [selectedContact, setSelectedContact] = useState<PresentialContact | null>(
    suggestedContacts.length === 1 ? suggestedContacts[0] : null,
  );
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [manualPhone, setManualPhone] = useState("");

  // Reminder config
  const [reminderSteps, setReminderSteps] = useState<Set<ReminderStep>>(new Set<ReminderStep>(["immediate"]));
  const [channels, setChannels] = useState<Set<Channel>>(new Set());
  const hasAnyReminder = reminderSteps.size > 0;
  const needsPhone = channels.has("whatsapp");
  const needsEmail = channels.has("email");

  const [submitting, setSubmitting] = useState(false);

  function toggleStep(step: ReminderStep) {
    setReminderSteps((prev) => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  }

  function toggleChannel(ch: Channel) {
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return next;
    });
  }

  const effectiveEmail = selectedContact?.email || manualEmail || undefined;
  const effectivePhone = selectedContact?.whatsapp || selectedContact?.phone || manualPhone || undefined;
  const effectiveName = selectedContact?.name || undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("Título obrigatório"); return; }
    if (!date || !startTime) { toast.error("Data e hora obrigatórias"); return; }
    if (needsEmail && !effectiveEmail) { toast.error("Email do contato obrigatório para confirmação por email"); return; }
    if (needsPhone && !effectivePhone) { toast.error("Telefone do contato obrigatório para confirmação por WhatsApp"); return; }

    const startAt = new Date(`${date}T${startTime}:00`);
    const endAt = new Date(startAt.getTime() + duration * 60 * 1000);

    setSubmitting(true);
    try {
      await apiFetch("/meetings/presential", token, {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          attendeeEmails: effectiveEmail ? [effectiveEmail] : [],
          location: location.trim() || undefined,
          description: description.trim() || undefined,
          leadId,
          contactId,
          organizationId,
          dealId,
          reminderSteps: Array.from(reminderSteps),
          reminderChannels: Array.from(channels),
          attendeeEmail: effectiveEmail,
          attendeePhone: effectivePhone,
          contactName: effectiveName,
        }),
      });
      toast.success("Reunião presencial agendada!");
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao agendar reunião");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-lg rounded-xl border border-[#3d2b4d] bg-[#1a0022] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3d2b4d] px-5 py-4">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-purple-400" />
            <h2 className="text-base font-semibold text-white">Reunião Presencial</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-[#2d1b3d] hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Visita Comercial"
              className="w-full rounded-md border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              required
            />
          </div>

          {/* Date + Time + Duration */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="mb-1 block text-xs font-medium text-gray-400">Data *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Horário *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-md border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Duração</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full rounded-md border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              >
                <option value={30}>30 min</option>
                <option value={60}>1h</option>
                <option value={90}>1h30</option>
                <option value={120}>2h</option>
                <option value={180}>3h</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">
              <MapPin size={11} className="inline mr-1" />
              Local (opcional)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Rua das Flores, 100 — Sala 202"
              className="w-full rounded-md border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Contact */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">
              <User size={11} className="inline mr-1" />
              Contato (opcional)
            </label>
            {suggestedContacts.length > 0 ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowContactDropdown((v) => !v)}
                  className="flex w-full items-center justify-between rounded-md border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                >
                  <span className={selectedContact ? "text-white" : "text-gray-500"}>
                    {selectedContact ? `${selectedContact.name}${selectedContact.role ? ` · ${selectedContact.role}` : ""}` : "Selecionar contato..."}
                  </span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
                {showContactDropdown && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border border-[#3d2b4d] bg-[#1a0022] shadow-lg">
                    <button
                      type="button"
                      onClick={() => { setSelectedContact(null); setShowContactDropdown(false); }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-400 hover:bg-[#2d1b3d]"
                    >
                      Nenhum
                    </button>
                    {suggestedContacts.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setSelectedContact(c); setShowContactDropdown(false); }}
                        className="w-full px-3 py-2 text-left hover:bg-[#2d1b3d]"
                      >
                        <div className="text-sm font-medium text-white">{c.name}</div>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-400 mt-0.5">
                          {c.role && <span>{c.role}</span>}
                          {c.email && <span className="flex items-center gap-1"><Mail size={10} />{c.email}</span>}
                          {(c.whatsapp || c.phone) && <span className="flex items-center gap-1"><Phone size={10} />{c.whatsapp ?? c.phone}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* Manual email/phone if no contact selected or no contacts available */}
            {!selectedContact && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="Email do contato"
                  className="rounded-md border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                />
                <input
                  type="tel"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="WhatsApp do contato"
                  className="rounded-md border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                />
              </div>
            )}

            {/* Show resolved contact info */}
            {selectedContact && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
                {effectiveEmail && <span className="flex items-center gap-1"><Mail size={10} className="text-purple-400" />{effectiveEmail}</span>}
                {effectivePhone && <span className="flex items-center gap-1"><Phone size={10} className="text-green-400" />{effectivePhone}</span>}
                {!effectiveEmail && !effectivePhone && (
                  <span className="text-yellow-500">Contato sem email nem telefone cadastrado</span>
                )}
              </div>
            )}
          </div>

          {/* Confirmações e lembretes */}
          <div className="rounded-lg border border-[#3d2b4d] bg-[#2d1b3d] p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Confirmações e Lembretes (opcional)
            </p>

            {/* Steps */}
            <div className="mb-3 space-y-2">
              {(["immediate", "morning_reminder"] as ReminderStep[]).map((step) => (
                <label key={step} className="flex cursor-pointer items-center gap-2.5">
                  <div
                    onClick={() => toggleStep(step)}
                    className={`h-4 w-4 flex-shrink-0 rounded border transition-colors ${
                      reminderSteps.has(step)
                        ? "border-purple-500 bg-purple-500"
                        : "border-[#5d3b6d] bg-[#1a0022]"
                    } flex items-center justify-center cursor-pointer`}
                  >
                    {reminderSteps.has(step) && <Check size={10} className="text-white" />}
                  </div>
                  <span className="text-sm text-gray-300">{REMINDER_LABELS[step]}</span>
                </label>
              ))}
            </div>

            {/* Channels (only shown when any step is selected) */}
            {hasAnyReminder && (
              <div>
                <p className="mb-2 text-xs font-medium text-gray-500">Enviar por:</p>
                <div className="flex gap-3">
                  {(["email", "whatsapp"] as Channel[]).map((ch) => (
                    <label key={ch} className="flex cursor-pointer items-center gap-2">
                      <div
                        onClick={() => toggleChannel(ch)}
                        className={`h-4 w-4 flex-shrink-0 rounded border transition-colors ${
                          channels.has(ch)
                            ? "border-purple-500 bg-purple-500"
                            : "border-[#5d3b6d] bg-[#1a0022]"
                        } flex items-center justify-center cursor-pointer`}
                      >
                        {channels.has(ch) && <Check size={10} className="text-white" />}
                      </div>
                      <span className="flex items-center gap-1 text-sm text-gray-300">
                        {ch === "email" ? <Mail size={12} /> : <Phone size={12} />}
                        {ch === "email" ? "Email" : "WhatsApp"}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Warnings */}
                {needsEmail && !effectiveEmail && (
                  <p className="mt-2 text-xs text-yellow-400">Informe o email do contato para envio por email.</p>
                )}
                {needsPhone && !effectivePhone && (
                  <p className="mt-2 text-xs text-yellow-400">Informe o WhatsApp do contato para envio por WhatsApp.</p>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Observações (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Pauta, materiais necessários..."
              className="w-full rounded-md border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-[#3d2b4d]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-400 hover:bg-[#2d1b3d]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
              Agendar Presencial
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
