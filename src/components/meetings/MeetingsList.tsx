"use client";

import { useState } from "react";
import {
  Video,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Play,
  FileText,
  Pencil,
  Copy,
  Check,
  NotebookPen,
} from "lucide-react";
import { cancelMeeting } from "@/actions/meetings";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import ScheduleMeetingModal, { type SuggestedContact, type MeetingInitialData } from "./ScheduleMeetingModal";

interface Meeting {
  id: string;
  title: string;
  googleEventId: string | null;
  meetLink: string | null;
  startAt: Date;
  endAt: Date | null;
  actualStartAt: Date | null;
  actualEndAt: Date | null;
  attendeeEmails: string; // JSON array
  status: string; // scheduled | ended | cancelled
  recordingDriveId: string | null;
  recordingUrl: string | null;
  transcriptText: string | null;
  nativeTranscriptUrl: string | null;
  meetingSummary: string | null;
  activityId: string | null;
  activity?: { id: string; completed: boolean; completedAt: Date | null } | null;
}

interface Props {
  meetings: Meeting[];
  leadId?: string;
  contactId?: string;
  organizationId?: string;
  dealId?: string;
  /** Contacts shown as clickable chips in the schedule modal */
  suggestedContacts?: SuggestedContact[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  scheduled: {
    label: "Agendada",
    color: "bg-blue-100 text-blue-700",
    icon: <Clock size={12} />,
  },
  ended: {
    label: "Concluída",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle size={12} />,
  },
  cancelled: {
    label: "Cancelada",
    color: "bg-red-100 text-red-700",
    icon: <XCircle size={12} />,
  },
};

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

interface Attendee {
  email: string;
  responseStatus: "needsAction" | "accepted" | "declined" | "tentative";
  organizer?: boolean;
  self?: boolean;
}

const RSVP_CONFIG: Record<
  Attendee["responseStatus"],
  { label: string; color: string }
> = {
  accepted:    { label: "Aceitou",    color: "bg-green-100 text-green-700" },
  declined:    { label: "Recusou",    color: "bg-red-100 text-red-700" },
  tentative:   { label: "Talvez",     color: "bg-yellow-100 text-yellow-700" },
  needsAction: { label: "Pendente",   color: "bg-gray-100 text-gray-500" },
};

function parseAttendees(json: string): Attendee[] {
  try {
    const parsed = JSON.parse(json);
    // Support both old format (string[]) and new format ({email, responseStatus}[])
    if (Array.isArray(parsed) && parsed.length > 0) {
      if (typeof parsed[0] === "string") {
        return parsed.map((email: string) => ({ email, responseStatus: "needsAction" as const }));
      }
      return parsed as Attendee[];
    }
    return [];
  } catch {
    return [];
  }
}

export default function MeetingsList({
  meetings: initial,
  leadId,
  contactId,
  organizationId,
  dealId,
  suggestedContacts = [],
}: Props) {
  const [meetings, setMeetings] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(null);
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null);

  function handleSummaryUpdated(meetingId: string, newSummary: string | null) {
    setMeetings((prev) =>
      prev.map((m) => (m.id === meetingId ? { ...m, meetingSummary: newSummary } : m))
    );
  }

  const now = new Date();
  const upcoming = meetings
    .filter((m) => m.status === "scheduled" && new Date(m.startAt) >= now)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()); // soonest first
  const past = meetings
    .filter((m) => m.status !== "scheduled" || new Date(m.startAt) < now)
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()); // most recent first

  async function handleCancel(id: string) {
    try {
      await cancelMeeting(id);
      setMeetings((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: "cancelled" } : m))
      );
      toast.success("Reunião cancelada. Os convidados foram notificados.");
    } catch {
      toast.error("Erro ao cancelar reunião");
    }
  }

  function handleCreated() {
    window.location.reload();
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
        <h2 className="text-lg font-bold text-gray-900">Reuniões ({meetings.length})</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
        >
          <Plus size={15} />
          Agendar Reunião
        </button>
      </div>

      {meetings.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <Video size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500 mb-3">Nenhuma reunião agendada</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Plus size={15} />
            Agendar Primeira Reunião
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Próximas
              </h3>
              <ul className="space-y-2">
                {upcoming.map((m) => (
                  <MeetingCard
                    key={m.id}
                    meeting={m}
                    suggestedContacts={suggestedContacts}
                    expandedTranscript={expandedTranscript}
                    expandedSummary={expandedSummary}
                    onToggleTranscript={setExpandedTranscript}
                    onToggleSummary={setExpandedSummary}
                    onSummaryUpdated={handleSummaryUpdated}
                    onCancel={handleCancel}
                    onEdit={setEditingMeeting}
                  />
                ))}
              </ul>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Histórico
              </h3>
              <ul className="space-y-2">
                {past.map((m) => (
                  <MeetingCard
                    key={m.id}
                    meeting={m}
                    suggestedContacts={suggestedContacts}
                    expandedTranscript={expandedTranscript}
                    expandedSummary={expandedSummary}
                    onToggleTranscript={setExpandedTranscript}
                    onToggleSummary={setExpandedSummary}
                    onSummaryUpdated={handleSummaryUpdated}
                    onCancel={handleCancel}
                    onEdit={setEditingMeeting}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <ScheduleMeetingModal
          leadId={leadId}
          contactId={contactId}
          organizationId={organizationId}
          dealId={dealId}
          suggestedContacts={suggestedContacts}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}

      {editingMeeting && (
        <ScheduleMeetingModal
          leadId={leadId}
          contactId={contactId}
          organizationId={organizationId}
          dealId={dealId}
          suggestedContacts={suggestedContacts}
          meetingId={editingMeeting.id}
          initialData={{
            title: editingMeeting.title,
            startAt: new Date(editingMeeting.startAt),
            endAt: editingMeeting.endAt ? new Date(editingMeeting.endAt) : null,
            attendeeEmails: editingMeeting.attendeeEmails,
          }}
          onClose={() => setEditingMeeting(null)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={handleCopy}
      title="Copiar"
      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
    >
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
    </button>
  );
}

function MeetingCard({
  meeting,
  suggestedContacts,
  expandedTranscript,
  expandedSummary,
  onToggleTranscript,
  onToggleSummary,
  onSummaryUpdated,
  onCancel,
  onEdit,
}: {
  meeting: Meeting;
  suggestedContacts: SuggestedContact[];
  expandedTranscript: string | null;
  expandedSummary: string | null;
  onToggleTranscript: (id: string | null) => void;
  onToggleSummary: (id: string | null) => void;
  onSummaryUpdated: (id: string, summary: string | null) => void;
  onCancel: (id: string) => Promise<void>;
  onEdit: (meeting: Meeting) => void;
}) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const contactByEmail = new Map(suggestedContacts.map((c) => [c.email, c]));
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState(meeting.meetingSummary ?? "");
  const [savingSummary, setSavingSummary] = useState(false);

  const statusCfg = STATUS_CONFIG[meeting.status] ?? STATUS_CONFIG.scheduled;
  const isScheduled = meeting.status === "scheduled";
  const isEnded = meeting.status === "ended";
  const hasRecording = !!meeting.recordingUrl;
  const hasTranscript = !!meeting.transcriptText;
  const hasSummary = !!meeting.meetingSummary;
  const isTranscriptOpen = expandedTranscript === meeting.id;
  const isSummaryOpen = expandedSummary === meeting.id;
  const attendees = parseAttendees(meeting.attendeeEmails);
  const externalAttendees = attendees.filter((a) => !a.self);

  async function handleConfirmCancel() {
    setCancelling(true);
    try {
      await onCancel(meeting.id);
    } finally {
      setCancelling(false);
      setConfirmingCancel(false);
    }
  }

  async function handleSaveSummary() {
    setSavingSummary(true);
    try {
      await apiFetch(`/meetings/${meeting.id}/summary`, token, { method: "PATCH", body: JSON.stringify({ summary: summaryDraft.trim() || null }) });
      onSummaryUpdated(meeting.id, summaryDraft.trim() || null);
      setEditingSummary(false);
      toast.success("Resumo salvo.");
    } catch {
      toast.error("Erro ao salvar resumo.");
    } finally {
      setSavingSummary(false);
    }
  }

  function handleCancelEditSummary() {
    setSummaryDraft(meeting.meetingSummary ?? "");
    setEditingSummary(false);
  }

  return (
    <li className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <Video size={18} className="mt-0.5 flex-shrink-0 text-purple-500" />

        <div className="min-w-0 flex-1">
          {/* Title + status */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-gray-900 text-sm">{meeting.title}</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.color}`}
            >
              {statusCfg.icon}
              {statusCfg.label}
            </span>
          </div>

          {/* Date/time */}
          <div className="mt-0.5 space-y-0.5">
            <p className="text-xs text-gray-500">
              <span className="font-medium text-gray-400">Agendado:</span>{" "}
              {formatDateTime(meeting.startAt)}
              {meeting.endAt && new Date(meeting.endAt) > new Date(meeting.startAt) && (
                <> — {new Date(meeting.endAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</>
              )}
            </p>
            {meeting.status === "ended" && meeting.actualEndAt && (
              <p className="text-xs text-green-600">
                <span className="font-medium">Encerrado:</span>{" "}
                {meeting.actualStartAt
                  ? `${new Date(meeting.actualStartAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} — `
                  : ""}
                {new Date(meeting.actualEndAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                {", "}
                {new Date(meeting.actualEndAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
              </p>
            )}
          </div>

          {/* Attendees with RSVP status */}
          {externalAttendees.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {externalAttendees.map((a) => {
                const rsvp = RSVP_CONFIG[a.responseStatus] ?? RSVP_CONFIG.needsAction;
                const contact = contactByEmail.get(a.email);
                return (
                  <span
                    key={a.email}
                    title={a.email}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${rsvp.color}`}
                  >
                    {contact ? (
                      <>
                        <span className="font-semibold">{contact.name}</span>
                        {contact.role && <span className="opacity-60">· {contact.role}</span>}
                      </>
                    ) : (
                      <span className="max-w-[140px] truncate">{a.email}</span>
                    )}
                    <span className="opacity-70">· {rsvp.label}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {isScheduled && meeting.meetLink && !confirmingCancel && (
            <a
              href={meeting.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
            >
              <Video size={12} />
              Entrar
            </a>
          )}

          {isScheduled && !confirmingCancel && (
            <button
              onClick={() => onEdit(meeting)}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              title="Editar reunião"
            >
              <Pencil size={13} />
            </button>
          )}

          {isScheduled && !confirmingCancel && (
            <button
              onClick={() => setConfirmingCancel(true)}
              className="rounded-md px-2 py-1.5 text-xs text-red-500 hover:bg-red-50"
            >
              Cancelar
            </button>
          )}

          {/* Inline cancel confirmation */}
          {isScheduled && confirmingCancel && (
            <div className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5">
              {cancelling ? (
                <Loader2 size={13} className="animate-spin text-red-500" />
              ) : (
                <>
                  <span className="text-xs text-red-700 font-medium">
                    Cancelar e notificar convidados?
                  </span>
                  <button
                    onClick={handleConfirmCancel}
                    className="rounded bg-red-500 px-2 py-0.5 text-xs font-semibold text-white hover:bg-red-600"
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => setConfirmingCancel(false)}
                    className="rounded px-2 py-0.5 text-xs font-medium text-red-500 hover:bg-red-100"
                  >
                    Não
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action bar: recording, summary, transcript (ended meetings) */}
      {isEnded && (hasRecording || hasTranscript || hasSummary || true) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3">
          {hasRecording && (
            <a
              href={meeting.recordingUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100"
            >
              <Play size={13} />
              Ver Gravação
            </a>
          )}

          {/* Summary button — always show for ended meetings so user can add manually */}
          <button
            onClick={() => onToggleSummary(isSummaryOpen ? null : meeting.id)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              hasSummary
                ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                : "border-dashed border-gray-300 bg-white text-gray-400 hover:border-amber-300 hover:text-amber-600"
            }`}
          >
            <NotebookPen size={13} />
            {isSummaryOpen ? "Ocultar Resumo" : hasSummary ? "Ver Resumo" : "Adicionar Resumo"}
          </button>

          {hasTranscript && (
            <button
              onClick={() => onToggleTranscript(isTranscriptOpen ? null : meeting.id)}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              <FileText size={13} />
              {isTranscriptOpen ? "Ocultar Transcrição" : "Ver Transcrição"}
            </button>
          )}
        </div>
      )}

      {/* Summary panel (expanded) */}
      {isSummaryOpen && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-800">Resumo da Reunião</p>
            <div className="flex items-center gap-1">
              {!editingSummary && meeting.meetingSummary && (
                <CopyButton text={meeting.meetingSummary} />
              )}
              {!editingSummary && (
                <button
                  onClick={() => { setSummaryDraft(meeting.meetingSummary ?? ""); setEditingSummary(true); }}
                  title="Editar resumo"
                  className="rounded p-1 text-amber-500 hover:bg-amber-100 hover:text-amber-700"
                >
                  <Pencil size={13} />
                </button>
              )}
            </div>
          </div>

          {editingSummary ? (
            <div className="space-y-2">
              <textarea
                value={summaryDraft}
                onChange={(e) => setSummaryDraft(e.target.value)}
                rows={8}
                className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-xs text-gray-700 leading-relaxed focus:border-amber-500 focus:outline-none"
                placeholder="Escreva o resumo da reunião..."
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveSummary}
                  disabled={savingSummary}
                  className="flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {savingSummary ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Salvar
                </button>
                <button
                  onClick={handleCancelEditSummary}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-amber-100"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-xs text-amber-900 leading-relaxed">
              {meeting.meetingSummary || (
                <span className="italic text-amber-500">
                  Nenhum resumo ainda. Clique no lápis para adicionar.
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {/* Transcript panel (expanded) */}
      {isTranscriptOpen && meeting.transcriptText && (
        <div className="mt-3 rounded-md border border-gray-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600">Transcrição</p>
            <CopyButton text={meeting.transcriptText} />
          </div>
          <p className="whitespace-pre-wrap text-xs text-gray-700 leading-relaxed">
            {meeting.transcriptText}
          </p>
        </div>
      )}
    </li>
  );
}
