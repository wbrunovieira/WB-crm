"use client";

import { useState } from "react";
import {
  Video,
  Plus,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Play,
  FileText,
} from "lucide-react";
import { cancelMeeting } from "@/actions/meetings";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import ScheduleMeetingModal, { type SuggestedContact } from "./ScheduleMeetingModal";

interface Meeting {
  id: string;
  title: string;
  googleEventId: string | null;
  meetLink: string | null;
  startAt: Date;
  endAt: Date | null;
  attendeeEmails: string; // JSON array
  status: string; // scheduled | ended | cancelled
  recordingDriveId: string | null;
  recordingUrl: string | null;
  transcriptText: string | null;
  activityId: string | null;
  activity?: { id: string; completed: boolean; completedAt: Date | null } | null;
}

interface Props {
  meetings: Meeting[];
  leadId?: string;
  contactId?: string;
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
  dealId,
  suggestedContacts = [],
}: Props) {
  const [meetings, setMeetings] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(null);

  const now = new Date();
  const upcoming = meetings.filter((m) => m.status === "scheduled" && new Date(m.startAt) >= now);
  const past = meetings.filter((m) => m.status !== "scheduled" || new Date(m.startAt) < now);

  async function handleCancel(id: string) {
    if (!confirm("Cancelar esta reunião? Os convidados serão notificados.")) return;
    setCancelling(id);
    try {
      await cancelMeeting(id);
      setMeetings((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: "cancelled" } : m))
      );
      toast.success("Reunião cancelada");
    } catch {
      toast.error("Erro ao cancelar reunião");
    } finally {
      setCancelling(null);
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
                    expandedTranscript={expandedTranscript}
                    onToggleTranscript={setExpandedTranscript}
                    onCancel={handleCancel}
                    cancelling={cancelling}
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
                    expandedTranscript={expandedTranscript}
                    onToggleTranscript={setExpandedTranscript}
                    onCancel={handleCancel}
                    cancelling={cancelling}
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
          dealId={dealId}
          suggestedContacts={suggestedContacts}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function MeetingCard({
  meeting,
  expandedTranscript,
  onToggleTranscript,
  onCancel,
  cancelling,
}: {
  meeting: Meeting;
  expandedTranscript: string | null;
  onToggleTranscript: (id: string | null) => void;
  onCancel: (id: string) => void;
  cancelling: string | null;
}) {
  const statusCfg = STATUS_CONFIG[meeting.status] ?? STATUS_CONFIG.scheduled;
  const isCancelling = cancelling === meeting.id;
  const isScheduled = meeting.status === "scheduled";
  const isEnded = meeting.status === "ended";
  const hasRecording = !!meeting.recordingUrl;
  const hasTranscript = !!meeting.transcriptText;
  const isTranscriptOpen = expandedTranscript === meeting.id;
  const attendees = parseAttendees(meeting.attendeeEmails);
  // Exclude the organizer (self) from the display list
  const externalAttendees = attendees.filter((a) => !a.self);

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
          <p className="mt-0.5 text-xs text-gray-500">
            {formatDateTime(meeting.startAt)}
            {meeting.endAt && (
              <> — {new Date(meeting.endAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</>
            )}
          </p>

          {/* Attendees with RSVP status */}
          {externalAttendees.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {externalAttendees.map((a) => {
                const rsvp = RSVP_CONFIG[a.responseStatus] ?? RSVP_CONFIG.needsAction;
                return (
                  <span
                    key={a.email}
                    title={a.email}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${rsvp.color}`}
                  >
                    <span className="max-w-[140px] truncate">{a.email}</span>
                    <span className="opacity-70">· {rsvp.label}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {isScheduled && meeting.meetLink && (
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

          {isScheduled && !isCancelling && (
            <button
              onClick={() => onCancel(meeting.id)}
              className="rounded-md px-2 py-1.5 text-xs text-red-500 hover:bg-red-50"
            >
              Cancelar
            </button>
          )}

          {isCancelling && <Loader2 size={14} className="animate-spin text-gray-400" />}
        </div>
      </div>

      {/* Recording + Transcript (ended meetings) */}
      {isEnded && (hasRecording || hasTranscript) && (
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

      {/* Transcript text (expanded) */}
      {isTranscriptOpen && meeting.transcriptText && (
        <div className="mt-3 rounded-md border border-gray-200 bg-white p-3">
          <p className="text-xs font-semibold text-gray-600 mb-2">Transcrição</p>
          <p className="whitespace-pre-wrap text-xs text-gray-700 leading-relaxed">
            {meeting.transcriptText}
          </p>
        </div>
      )}
    </li>
  );
}
