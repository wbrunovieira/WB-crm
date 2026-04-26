"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDownUp, Calendar, Check, GripVertical, Loader2, MessageCircleReply, RotateCcw, SkipForward, UserPlus, Users, X, XCircle, Phone, Mail, Users2, ClipboardList, MapPin, Reply, Clock, Search } from "lucide-react";
import dynamic from "next/dynamic";
const GmailComposeModal = dynamic(() => import("@/components/gmail/GmailComposeModal"), { ssr: false });
const GoToCallPlayer = dynamic(() => import("@/components/activities/GoToCallPlayer"), { ssr: false });
import WhatsAppActivityLog from "@/components/whatsapp/WhatsAppActivityLog";
import type { WhatsAppMediaMessage } from "@/components/whatsapp/WhatsAppMessageLog";
import { formatDate, formatTime, formatRelativeTime } from "@/lib/utils";
import { useToggleActivityCompleted, useMarkActivityFailed, useMarkActivitySkipped, useRevertActivityOutcome, useUpdateActivity } from "@/hooks/activities/use-activities";
import PurgeActivityButton from "@/components/activities/PurgeActivityButton";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function IconWhatsApp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function IconLinkedIn({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function ActivityTypeIcon({ type, className }: { type: string; className?: string }) {
  const cls = className ?? "h-3.5 w-3.5";
  switch (type) {
    case "call":           return <Phone className={cls} />;
    case "email":          return <Mail className={cls} />;
    case "meeting":        return <Users2 className={cls} />;
    case "task":           return <ClipboardList className={cls} />;
    case "whatsapp":       return <IconWhatsApp className={cls} />;
    case "instagram_dm":
    case "instagram":      return <IconInstagram className={cls} />;
    case "linkedin":       return <IconLinkedIn className={cls} />;
    case "physical_visit": return <MapPin className={cls} />;
    default:               return <ClipboardList className={cls} />;
  }
}

function GoToOutcomeBadge({ outcome }: { outcome?: string | null }) {
  switch (outcome) {
    case "answered":
      return (
        <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          Atendida
        </span>
      );
    case "voicemail":
      return (
        <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          Caixa postal
        </span>
      );
    case "no_answer":
      return (
        <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          Não atendeu
        </span>
      );
    case "busy":
      return (
        <span className="inline-flex items-center gap-1 rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
          Ocupado
        </span>
      );
    case "rejected":
      return (
        <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
          Rejeitada
        </span>
      );
    case "invalid_number":
      return (
        <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          Número inválido
        </span>
      );
    case "missed":
      return (
        <span className="inline-flex items-center gap-1 rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
          Perdida
        </span>
      );
    default:
      return (
        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
          GoTo
        </span>
      );
  }
}

type LeadContact = {
  id: string;
  name: string;
  role: string | null;
  isPrimary: boolean;
  isActive: boolean;
};

type Activity = {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  dueDate: Date | string | null;
  completed: boolean;
  completedAt?: Date | string | null;
  failedAt?: Date | string | null;
  failReason?: string | null;
  skippedAt?: Date | string | null;
  skipReason?: string | null;
  leadContactIds?: string | null;
  callContactType?: string | null;
  gotoCallId?: string | null;
  gotoRecordingUrl?: string | null;
  gotoRecordingUrl2?: string | null;
  gotoTranscriptText?: string | null;
  gotoCallOutcome?: string | null;
  whatsappMessages?: WhatsAppMediaMessage[];
  // Campos de e-mail
  emailThreadId?: string | null;
  emailSubject?: string | null;
  emailFromAddress?: string | null;
  emailFromName?: string | null;
  emailReplied?: boolean | null;
};

const GOTO_OUTCOME_OPTIONS = [
  { value: "answered",  label: "Atendida" },
  { value: "no_answer", label: "Não atendeu" },
  { value: "busy",      label: "Ocupado" },
  { value: "voicemail", label: "Caixa postal" },
] as const;

function SortableActivityItem({
  activity,
  isPending,
  loadingId,
  handleToggle,
  openOutcomeModal,
  handleRevert,
  openAssignModal,
  openReplyModal,
  onChangeOutcome,
  onChangeContactType,
  getContactNames,
  leadContacts,
  typeConfig,
  receivedThreadIds,
  hasPrev,
  hasNext,
  isAdmin,
  onPurged,
}: {
  activity: Activity;
  isPending: (a: Activity) => boolean;
  loadingId: string | null;
  handleToggle: (e: React.MouseEvent, id: string) => void;
  openOutcomeModal: (e: React.MouseEvent, activity: Activity, type: "failed" | "skipped") => void;
  handleRevert: (e: React.MouseEvent, id: string) => void;
  openAssignModal: (e: React.MouseEvent, activity: Activity) => void;
  openReplyModal: (activity: Activity) => void;
  onChangeOutcome: (activityId: string, outcome: string) => void;
  onChangeContactType: (activityId: string, contactType: string) => void;
  getContactNames: (ids: string | null) => string[];
  leadContacts: LeadContact[];
  typeConfig: Record<string, { label: string; bg: string; text: string; border: string; dot: string }>;
  receivedThreadIds: Set<string>;
  hasPrev: boolean;
  hasNext: boolean;
  isAdmin: boolean;
  onPurged: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id });

  const [outcomePickerOpen, setOutcomePickerOpen] = useState(false);
  const [contactTypePickerOpen, setContactTypePickerOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group rounded-lg border border-l-4 p-4 transition-all duration-200 ${
        isDragging ? "shadow-xl ring-2 ring-purple-300" : ""
      } ${
        activity.failedAt
          ? "border-red-500/30 border-l-red-500 bg-red-500/10"
          : activity.skippedAt
            ? "border-amber-500/30 border-l-amber-500 bg-amber-500/10"
            : `border-[#3d2b4d] ${typeConfig[activity.type]?.border ?? "border-l-gray-400"} hover:shadow-md bg-[#2d1b3d]`
      }`}
    >
      {/* Thread connector lines */}
      {hasPrev && (
        <div className="absolute -top-3 left-6 h-3 w-0.5 bg-blue-300 z-10" />
      )}
      {hasNext && (
        <div className="absolute -bottom-3 left-6 h-3 w-0.5 bg-blue-300 z-10" />
      )}

      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1 flex-shrink-0 cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
          tabIndex={-1}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Toggle button */}
        {activity.gotoCallId ? (
          /* GoTo auto-logged — ícone fixo, sem toggle */
          <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-blue-400 bg-blue-500">
            <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
        ) : isPending(activity) ? (
          <button
            onClick={(e) => handleToggle(e, activity.id)}
            disabled={loadingId === activity.id}
            className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-[#3d2b4d] bg-[#2d1b3d] hover:border-primary hover:bg-primary/10 transition-all disabled:opacity-50"
            title="Marcar como concluída"
          >
            {loadingId === activity.id && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
          </button>
        ) : activity.completed ? (
          <button
            onClick={(e) => handleToggle(e, activity.id)}
            disabled={loadingId === activity.id}
            className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-green-500 bg-green-500 text-white transition-all disabled:opacity-50"
            title="Marcar como pendente"
          >
            {loadingId === activity.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
          </button>
        ) : activity.failedAt ? (
          <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-red-400 bg-red-100">
            <XCircle className="h-3.5 w-3.5 text-red-600" />
          </div>
        ) : (
          <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-100">
            <SkipForward className="h-3.5 w-3.5 text-amber-600" />
          </div>
        )}

        {/* Content — link wraps header only; player stays outside to avoid navigation */}
        <div className="flex-1 min-w-0">
          <Link href={`/activities/${activity.id}`} className="block">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${typeConfig[activity.type]?.bg ?? "bg-gray-100"} ${typeConfig[activity.type]?.text ?? "text-gray-800"}`}>
                <ActivityTypeIcon type={activity.type} className="h-3.5 w-3.5" />
                {typeConfig[activity.type]?.label ?? activity.type}
              </span>
              {activity.type === "email" && activity.emailFromAddress && !activity.emailReplied && (
                <span className="inline-flex items-center gap-1 rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                  <Clock className="h-3 w-3" />
                  Aguardando resposta
                </span>
              )}
              {activity.type === "email" && activity.emailFromAddress && activity.emailReplied && (
                <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  <Check className="h-3 w-3" />
                  Respondido
                </span>
              )}
              {activity.type === "email" && !activity.emailFromAddress && activity.emailThreadId && receivedThreadIds.has(activity.emailThreadId) && (
                <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-300 border border-blue-500/30">
                  <Reply className="h-3 w-3" />
                  Resposta enviada
                </span>
              )}
              {!activity.gotoCallId && (
                <>
                  {activity.completed && (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Concluída{activity.completedAt && ` em ${formatDate(activity.completedAt)}`}
                    </span>
                  )}
                  {activity.failedAt && (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Falhou
                    </span>
                  )}
                  {activity.skippedAt && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Pulada
                    </span>
                  )}
                </>
              )}
            </div>
            <h3 className={`mt-2 font-medium group-hover:text-purple-800 ${
              activity.completed
                ? "text-gray-500 line-through"
                : activity.failedAt || activity.skippedAt
                  ? "text-gray-500"
                  : "text-gray-900"
            }`}>
              {activity.subject}
            </h3>
            {activity.description && !activity.gotoCallId && activity.type !== "whatsapp" && (
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                {activity.description}
              </p>
            )}
            {activity.failReason && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                {activity.failReason}
              </p>
            )}
            {activity.skipReason && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600">
                <SkipForward className="h-3 w-3 flex-shrink-0" />
                {activity.skipReason}
              </p>
            )}
            {(() => {
              const names = getContactNames(activity.leadContactIds ?? null);
              return names.length > 0 ? (
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <Users className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                  {names.map((name, i) => (
                    <span key={i} className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                      {name}
                    </span>
                  ))}
                </div>
              ) : null;
            })()}
            {(() => {
              const dateRef = activity.completedAt ?? activity.dueDate;
              if (!dateRef) return null;
              const label = activity.completedAt ? (activity.emailFromAddress ? "Recebido" : "Enviado") : "Vencimento";
              return (
                <p className="mt-2 flex items-center gap-2 text-xs text-gray-500 group-hover:text-gray-600">
                  <span>{label}: {formatDate(dateRef)} às {formatTime(dateRef)}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-400 italic">{formatRelativeTime(dateRef)}</span>
                </p>
              );
            })()}
          </Link>

          {/* GoTo badges — fora do Link para não navegar ao clicar */}
          {activity.gotoCallId && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {/* Outcome picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setOutcomePickerOpen((v) => !v); setContactTypePickerOpen(false); }}
                  className="focus:outline-none"
                  title="Clique para alterar resultado"
                >
                  <GoToOutcomeBadge outcome={activity.gotoCallOutcome} />
                </button>
                {outcomePickerOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-[#3d2b4d] bg-[#1a0022] shadow-lg">
                    {GOTO_OUTCOME_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-[#2d1b3d] first:rounded-t-lg last:rounded-b-lg ${activity.gotoCallOutcome === opt.value ? "font-semibold text-purple-400" : "text-gray-300"}`}
                        onClick={() => { onChangeOutcome(activity.id, opt.value); setOutcomePickerOpen(false); }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Contact type picker: gatekeeper / decisor */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setContactTypePickerOpen((v) => !v); setOutcomePickerOpen(false); }}
                  className="focus:outline-none"
                  title="Tipo de contato na ligação"
                >
                  {activity.callContactType === "decisor" ? (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      🎯 Decisor
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      🚧 Gatekeeper
                    </span>
                  )}
                </button>
                {contactTypePickerOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 min-w-[150px] rounded-lg border border-[#3d2b4d] bg-[#1a0022] shadow-lg">
                    {[{ value: "gatekeeper", label: "🚧 Gatekeeper" }, { value: "decisor", label: "🎯 Decisor" }].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-[#2d1b3d] first:rounded-t-lg last:rounded-b-lg ${activity.callContactType === opt.value ? "font-semibold text-purple-400" : "text-gray-300"}`}
                        onClick={() => { onChangeContactType(activity.id, opt.value); setContactTypePickerOpen(false); }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {activity.completedAt && (
                <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-300">
                  {formatDate(activity.completedAt)}
                </span>
              )}
            </div>
          )}

          {/* WhatsApp log — fora do Link para não navegar ao clicar em áudio/transcrição */}
          {activity.type === "whatsapp" && activity.description && !activity.gotoCallId && (
            <WhatsAppActivityLog
              activityId={activity.id}
              description={activity.description}
              previewCount={3}
            />
          )}

          {/* GoTo player — fora do Link para não navegar ao clicar */}
          {activity.gotoCallId && activity.gotoRecordingUrl && (
            <div className="mt-2">
              <GoToCallPlayer
                activityId={activity.id}
                agentKey={activity.gotoRecordingUrl}
                clientKey={activity.gotoRecordingUrl2}
                transcriptText={activity.gotoTranscriptText}
                compact
              />
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {!activity.gotoCallId && (activity.failedAt || activity.skippedAt) && (
            <button
              onClick={(e) => handleRevert(e, activity.id)}
              disabled={loadingId === activity.id}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-50"
              title="Voltar para pendente"
            >
              {loadingId === activity.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
            </button>
          )}

          {!activity.gotoCallId && isPending(activity) && (
            <>
              <button
                onClick={(e) => openOutcomeModal(e, activity, "failed")}
                className="rounded-lg p-2 text-gray-400 hover:bg-red-500/15 hover:text-red-400 transition-colors"
                title="Marcar como falha"
              >
                <XCircle className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => openOutcomeModal(e, activity, "skipped")}
                className="rounded-lg p-2 text-gray-400 hover:bg-amber-500/15 hover:text-amber-400 transition-colors"
                title="Pular atividade"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </>
          )}

          {activity.type === "email" && activity.emailFromAddress && !activity.emailReplied && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); openReplyModal(activity); }}
              className="rounded-lg p-2 text-blue-400 hover:bg-blue-500/15 hover:text-blue-300 transition-colors"
              title="Responder e-mail"
            >
              <Reply className="h-4 w-4" />
            </button>
          )}

          {!activity.gotoCallId && leadContacts.some((c) => c.isActive) && isPending(activity) && (
            <button
              onClick={(e) => openAssignModal(e, activity)}
              className={`rounded-lg p-2 transition-colors ${
                activity.leadContactIds
                  ? "text-purple-500 hover:bg-purple-100 hover:text-purple-700"
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              }`}
              title="Associar contatos"
            >
              <UserPlus className="h-4 w-4" />
            </button>
          )}

          {isAdmin && (
            <PurgeActivityButton activityId={activity.id} onPurged={onPurged} />
          )}
          <Link href={`/activities/${activity.id}`} className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-gray-400 group-hover:text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function LeadActivitiesList({
  leadId,
  activities,
  activityOrder,
  leadContacts = [],
}: {
  leadId: string;
  activities: Activity[];
  activityOrder?: string | null;
  leadContacts?: LeadContact[];
}) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const isAdmin = session?.user?.role === "admin";
  const router = useRouter();
  const toggleCompleted = useToggleActivityCompleted();
  const markFailed = useMarkActivityFailed();
  const markSkipped = useMarkActivitySkipped();
  const revertOutcome = useRevertActivityOutcome();
  const updateActivity = useUpdateActivity();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [assigningActivity, setAssigningActivity] = useState<Activity | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [savingContacts, setSavingContacts] = useState(false);
  const [outcomeModal, setOutcomeModal] = useState<{ activity: Activity; type: "failed" | "skipped" } | null>(null);
  const [outcomeReason, setOutcomeReason] = useState("");
  const [outcomeLoading, setOutcomeLoading] = useState(false);
  const [replyingToActivity, setReplyingToActivity] = useState<Activity | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [replyModal, setReplyModal] = useState(false);
  const [replyChannel, setReplyChannel] = useState("email");
  const [replyNotes, setReplyNotes] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  const hasCustomOrder = !!activityOrder;

  // Sort activities based on custom order or default (server order by date)
  const sortedActivities = useMemo(() => {
    if (!activityOrder) return activities;
    try {
      const order = JSON.parse(activityOrder) as string[];
      const orderMap = new Map(order.map((id, idx) => [id, idx]));
      return [...activities].sort((a, b) => {
        const aIdx = orderMap.get(a.id) ?? Infinity;
        const bIdx = orderMap.get(b.id) ?? Infinity;
        return aIdx - bIdx;
      });
    } catch {
      return activities;
    }
  }, [activities, activityOrder]);

  const [orderedActivities, setOrderedActivities] = useState(sortedActivities);

  // Keep in sync with server data (compare full data, not just IDs)
  const sortedKey = JSON.stringify(sortedActivities);
  const orderedKey = JSON.stringify(orderedActivities);
  if (sortedKey !== orderedKey && !savingOrder) {
    setOrderedActivities(sortedActivities);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Não permite reordenar atividades concluídas/falha/puladas
    const activeActivity = orderedActivities.find((a) => a.id === active.id);
    const overActivity = orderedActivities.find((a) => a.id === over.id);
    if (!activeActivity || !overActivity || !isPending(activeActivity) || !isPending(overActivity)) return;

    const oldIndex = orderedActivities.findIndex((a) => a.id === active.id);
    const newIndex = orderedActivities.findIndex((a) => a.id === over.id);
    const newOrder = arrayMove(orderedActivities, oldIndex, newIndex);
    setOrderedActivities(newOrder);

    setSavingOrder(true);
    try {
      await apiFetch(`/leads/${leadId}/activity-order`, token, { method: "PATCH", body: JSON.stringify({ activityIds: newOrder.map((a) => a.id) }) });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar ordem");
      setOrderedActivities(sortedActivities);
    } finally {
      setSavingOrder(false);
    }
  };

  const handleResetOrder = async () => {
    setSavingOrder(true);
    try {
      await apiFetch(`/leads/${leadId}/activity-order`, token, { method: "DELETE" });
      toast.success("Ordem restaurada por data");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao restaurar ordem");
    } finally {
      setSavingOrder(false);
    }
  };

  const handleChangeOutcome = (activityId: string, outcome: string) => {
    updateActivity.mutate(
      { id: activityId, gotoCallOutcome: outcome },
      {
        onSuccess: () => { toast.success("Resultado atualizado"); router.refresh(); },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao atualizar resultado"),
      },
    );
  };

  const handleChangeContactType = (activityId: string, contactType: string) => {
    updateActivity.mutate(
      { id: activityId, callContactType: contactType },
      {
        onSuccess: () => { toast.success("Tipo de contato atualizado"); router.refresh(); },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao atualizar tipo de contato"),
      },
    );
  };

  const openAssignModal = (e: React.MouseEvent, activity: Activity) => {
    e.preventDefault();
    e.stopPropagation();
    const existing = activity.leadContactIds ? JSON.parse(activity.leadContactIds) as string[] : [];
    setSelectedContactIds(new Set(existing));
    setAssigningActivity(activity);
  };

  const handleSaveContacts = () => {
    if (!assigningActivity) return;
    setSavingContacts(true);
    const leadContactIds = selectedContactIds.size === 0 ? null : Array.from(selectedContactIds);
    updateActivity.mutate(
      { id: assigningActivity.id, leadContactIds },
      {
        onSuccess: () => { toast.success("Contatos atualizados"); setAssigningActivity(null); router.refresh(); },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao salvar contatos"),
        onSettled: () => setSavingContacts(false),
      },
    );
  };

  const toggleContact = (contactId: string) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  };

  const getContactNames = (leadContactIdsJson: string | null): string[] => {
    if (!leadContactIdsJson) return [];
    try {
      const ids = JSON.parse(leadContactIdsJson) as string[];
      return ids.map((id) => {
        const contact = leadContacts.find((c) => c.id === id);
        return contact?.name ?? "Desconhecido";
      });
    } catch {
      return [];
    }
  };

  const typeConfig: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
    call:           { label: "Ligação",      bg: "bg-violet-100", text: "text-violet-800", border: "border-l-violet-500",  dot: "bg-violet-500" },
    meeting:        { label: "Reunião",      bg: "bg-amber-100",  text: "text-amber-800",  border: "border-l-amber-500",   dot: "bg-amber-500" },
    email:          { label: "E-mail",       bg: "bg-blue-100",   text: "text-blue-800",   border: "border-l-blue-500",    dot: "bg-blue-500" },
    task:           { label: "Tarefa",       bg: "bg-slate-100",  text: "text-slate-700",  border: "border-l-slate-400",   dot: "bg-slate-400" },
    whatsapp:       { label: "WhatsApp",     bg: "bg-[#25D366]",  text: "text-white",      border: "border-l-emerald-500", dot: "bg-emerald-500" },
    linkedin:       { label: "LinkedIn",     bg: "bg-sky-600",    text: "text-white",      border: "border-l-sky-600",     dot: "bg-sky-600" },
    instagram_dm:   { label: "Instagram DM",bg: "bg-pink-500",   text: "text-white",      border: "border-l-pink-500",    dot: "bg-pink-500" },
    instagram:      { label: "Instagram",    bg: "bg-pink-500",   text: "text-white",      border: "border-l-pink-500",    dot: "bg-pink-500" },
    physical_visit: { label: "Visita",       bg: "bg-teal-100",   text: "text-teal-800",   border: "border-l-teal-500",    dot: "bg-teal-500" },
  };

  const handleToggle = (e: React.MouseEvent, activityId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setLoadingId(activityId);
    toggleCompleted.mutate(activityId, {
      onSuccess: () => router.refresh(),
      onSettled: () => setLoadingId(null),
    });
  };

  const openOutcomeModal = (e: React.MouseEvent, activity: Activity, type: "failed" | "skipped") => {
    e.preventDefault();
    e.stopPropagation();
    setOutcomeReason("");
    setOutcomeModal({ activity, type });
  };

  const handleSubmitOutcome = () => {
    if (!outcomeModal || !outcomeReason.trim()) return;
    setOutcomeLoading(true);
    const { activity: act, type } = outcomeModal;
    const mutate = type === "failed"
      ? markFailed.mutateAsync({ id: act.id, reason: outcomeReason })
      : markSkipped.mutateAsync({ id: act.id, reason: outcomeReason });

    mutate.then(() => {
      toast.success(type === "failed" ? "Atividade marcada como falha" : "Atividade pulada");
      setOutcomeModal(null);
      router.refresh();
    }).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar atividade");
    }).finally(() => setOutcomeLoading(false));
  };

  const handleRevert = (e: React.MouseEvent, activityId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setLoadingId(activityId);
    revertOutcome.mutate(activityId, {
      onSuccess: () => { toast.success("Atividade voltou para pendente"); router.refresh(); },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao reverter"),
      onSettled: () => setLoadingId(null),
    });
  };

  const handleRegisterReply = async () => {
    setReplyLoading(true);
    try {
      const result = await apiFetch<{ activityId: string; cancelledCadences: number; skippedActivities: number }>(
        `/cadences/lead/${leadId}/reply`,
        token,
        { method: "POST", body: JSON.stringify({ channel: replyChannel, notes: replyNotes || undefined }) },
      );
      const msgs: string[] = ["Resposta registrada!"];
      if (result.cancelledCadences > 0) {
        msgs.push(`${result.cancelledCadences} cadência(s) cancelada(s)`);
      }
      if (result.skippedActivities > 0) {
        msgs.push(`${result.skippedActivities} atividade(s) pendente(s) cancelada(s)`);
      }
      toast.success(msgs.join(" · "));
      setReplyModal(false);
      setReplyNotes("");
      setReplyChannel("email");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar resposta");
    } finally {
      setReplyLoading(false);
    }
  };

  const hasPendingActivities = activities.some((a) => !a.completed && !a.failedAt && !a.skippedAt);

  const isPending = (a: Activity) => !a.completed && !a.failedAt && !a.skippedAt;

  // Pending na ordem drag customizada; done ordenado por data de conclusão/falha/skip (mais recente primeiro)
  const displayActivities = useMemo(() => {
    const pending = orderedActivities.filter(isPending);
    const done = [...orderedActivities]
      .filter((a) => !isPending(a))
      .sort((a, b) => {
        const aRaw = a.completedAt ?? a.failedAt ?? a.skippedAt;
        const aDate = aRaw ? new Date(aRaw).getTime() : 0;
        const bRaw = b.completedAt ?? b.failedAt ?? b.skippedAt;
        const bDate = bRaw ? new Date(bRaw).getTime() : 0;
        return bDate - aDate;
      });
    return [...pending, ...done];
  }, [orderedActivities]);

  // Atividades filtradas por busca + tipo + status
  const filteredActivities = useMemo(() => {
    return displayActivities.filter((a) => {
      if (filterType !== "all" && a.type !== filterType) return false;
      if (filterStatus === "pending" && !isPending(a)) return false;
      if (filterStatus === "completed" && (!a.completed || a.failedAt || a.skippedAt)) return false;
      if (filterStatus === "failed" && !a.failedAt) return false;
      if (filterStatus === "skipped" && !a.skippedAt) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          a.subject.toLowerCase().includes(q) ||
          (a.description ?? "").toLowerCase().includes(q) ||
          (a.emailFromAddress ?? "").toLowerCase().includes(q) ||
          (a.emailFromName ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [displayActivities, filterType, filterStatus, searchQuery]);

  // Mapa de conectores de thread: hasPrev/hasNext para linhas visuais
  const threadConnectors = useMemo(() => {
    const map = new Map<string, { hasPrev: boolean; hasNext: boolean }>();
    for (let i = 0; i < filteredActivities.length; i++) {
      const a = filteredActivities[i];
      if (!a.emailThreadId) continue;
      const prev = filteredActivities[i - 1];
      const next = filteredActivities[i + 1];
      const hasPrev = prev?.emailThreadId === a.emailThreadId;
      const hasNext = next?.emailThreadId === a.emailThreadId;
      if (hasPrev || hasNext) map.set(a.id, { hasPrev, hasNext });
    }
    return map;
  }, [filteredActivities]);

  // Set de threadIds de e-mails recebidos — usado para marcar respostas enviadas
  const receivedThreadIds = useMemo(
    () =>
      new Set(
        activities
          .filter((a) => a.type === "email" && a.emailFromAddress && a.emailThreadId)
          .map((a) => a.emailThreadId!)
      ),
    [activities]
  );

  return (
    <div className="rounded-xl bg-[#1a0022] p-6 shadow-md">
      <div className="mb-5 flex items-center justify-between pb-3 border-b-2 border-[#3d2b4d]">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">📅</span>
          Atividades ({activities.length})
        </h2>
        <div className="flex items-center gap-2">
          {hasCustomOrder && (
            <button
              onClick={handleResetOrder}
              disabled={savingOrder}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-2 text-xs font-medium text-gray-400 hover:bg-[#3d2b4d] hover:text-gray-200 transition-all disabled:opacity-50"
              title="Voltar a ordenar por data"
            >
              <Calendar className="h-3.5 w-3.5" />
              Ordenar por data
            </button>
          )}
          {!hasCustomOrder && activities.length > 1 && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <ArrowDownUp className="h-3 w-3" />
              Arraste para reordenar
            </span>
          )}
          {hasPendingActivities && (
            <button
              onClick={() => setReplyModal(true)}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-green-500/50 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-400 hover:bg-green-500/20 hover:shadow-md transition-all duration-200"
            >
              <MessageCircleReply className="h-4 w-4" />
              Registrar Resposta
            </button>
          )}
          <Link
            href={`/activities/new?leadId=${leadId}`}
            className="inline-flex items-center gap-2 rounded-lg bg-[#792990] px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            <span className="text-lg text-white">+</span>
            Adicionar Atividade
          </Link>
        </div>
      </div>

      {/* Activity stats summary */}
      {activities.length > 0 && (() => {
        const callActivities = activities.filter((a) => a.gotoCallId);
        const byOutcome = {
          answered:       callActivities.filter((a) => a.gotoCallOutcome === "answered").length,
          voicemail:      callActivities.filter((a) => a.gotoCallOutcome === "voicemail").length,
          no_answer:      callActivities.filter((a) => a.gotoCallOutcome === "no_answer").length,
          busy:           callActivities.filter((a) => a.gotoCallOutcome === "busy").length,
          rejected:       callActivities.filter((a) => a.gotoCallOutcome === "rejected").length,
          missed:         callActivities.filter((a) => a.gotoCallOutcome === "missed").length,
          invalid_number: callActivities.filter((a) => a.gotoCallOutcome === "invalid_number").length,
        };
        const meetings  = activities.filter((a) => a.type === "meeting").length;
        const whatsapps = activities.filter((a) => a.type === "whatsapp").length;
        const emails    = activities.filter((a) => a.type === "email").length;
        const tasks     = activities.filter((a) => a.type === "task").length;

        const callOutcomeItems: { label: string; count: number; color: string }[] = [
          { label: "Atendidas",       count: byOutcome.answered,       color: "text-green-400 bg-green-500/10 border-green-500/30" },
          { label: "Não atendeu",     count: byOutcome.no_answer,      color: "text-red-400 bg-red-500/10 border-red-500/30" },
          { label: "Perdidas",        count: byOutcome.missed,         color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
          { label: "Caixa postal",    count: byOutcome.voicemail,      color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
          { label: "Ocupado",         count: byOutcome.busy,           color: "text-orange-400 bg-orange-500/10 border-orange-500/30" },
          { label: "Rejeitada",       count: byOutcome.rejected,       color: "text-red-400 bg-red-500/10 border-red-500/30" },
          { label: "Nº inválido",     count: byOutcome.invalid_number, color: "text-gray-400 bg-[#2d1b3d] border-[#3d2b4d]" },
        ].filter((i) => i.count > 0);

        const statChips: { type: string; label: string; count: number; base: string; active: string; ring: string }[] = [
          { type: "all",            label: "Total",    count: activities.length,     base: "border-[#4a3060] bg-[#2d1b3d] text-gray-400",               active: "border-[#a855f7] bg-[#792990]/40 text-purple-200",  ring: "ring-[#792990]/60" },
          { type: "call",           label: "Ligações", count: callActivities.length, base: "border-violet-500/30 bg-violet-500/10 text-violet-400",       active: "border-violet-400 bg-violet-500/30 text-violet-200", ring: "ring-violet-500/50" },
          { type: "meeting",        label: "Reuniões", count: meetings,              base: "border-amber-500/30 bg-amber-500/10 text-amber-400",           active: "border-amber-400 bg-amber-500/30 text-amber-200",   ring: "ring-amber-500/50" },
          { type: "whatsapp",       label: "WhatsApp", count: whatsapps,             base: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",     active: "border-emerald-400 bg-emerald-500/30 text-emerald-200", ring: "ring-emerald-500/50" },
          { type: "email",          label: "E-mail",   count: emails,                base: "border-blue-500/30 bg-blue-500/10 text-blue-400",              active: "border-blue-400 bg-blue-500/30 text-blue-200",      ring: "ring-blue-500/50" },
          { type: "task",           label: "Tarefas",  count: tasks,                 base: "border-[#4a3060] bg-[#2d1b3d] text-gray-400",                 active: "border-slate-400 bg-slate-500/25 text-slate-200",   ring: "ring-slate-500/50" },
        ].filter((c) => c.count > 0 || c.type === "all");

        return (
          <div className="mb-4 rounded-lg border border-[#3d2b4d] bg-[#2d1b3d] p-3 space-y-2">
            {/* Clickable type filter chips */}
            <div className="flex flex-wrap gap-1.5">
              {statChips.map(({ type, label, count, base, active, ring }) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-all ${
                    filterType === type
                      ? `${active} shadow-sm ring-2 ring-offset-1 ring-offset-[#1a0022] ${ring}`
                      : `${base} hover:border-opacity-60 hover:brightness-125`
                  }`}
                >
                  {filterType === type && <Check className="h-3 w-3 flex-shrink-0 opacity-80" />}
                  <ActivityTypeIcon type={type} className="h-3 w-3" />
                  {label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${filterType === type ? "bg-current/20" : "bg-current/10"}`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>

            {/* Call outcome breakdown (non-clickable, contextual) */}
            {callOutcomeItems.length > 0 && (filterType === "all" || filterType === "call") && (
              <div className="flex flex-wrap gap-1.5 border-t border-gray-200 pt-2">
                {callOutcomeItems.map((item) => (
                  <div key={item.label} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${item.color}`}>
                    <span>{item.label}</span>
                    <span className="font-bold">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Busca e filtros */}
      {activities.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar atividades..."
              className="w-full rounded-lg border border-[#3d2b4d] bg-[#2d1b3d] py-2 pl-9 pr-3 text-sm text-gray-200 placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {([
              { key: "all",       label: "Todas",      active: "border-[#a855f7] bg-[#792990]/35 text-purple-200 ring-[#792990]/50",  inactive: "border-[#4a3060] bg-[#2d1b3d] text-gray-400 hover:border-[#5a3a70] hover:text-gray-300" },
              { key: "pending",   label: "Pendentes",  active: "border-blue-400 bg-blue-500/25 text-blue-200 ring-blue-500/50",       inactive: "border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:border-blue-400" },
              { key: "completed", label: "Concluídas", active: "border-green-400 bg-green-500/25 text-green-200 ring-green-500/50",   inactive: "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:border-green-400" },
              { key: "failed",    label: "Falha",      active: "border-red-400 bg-red-500/25 text-red-200 ring-red-500/50",           inactive: "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-400" },
              { key: "skipped",   label: "Puladas",    active: "border-amber-400 bg-amber-500/25 text-amber-200 ring-amber-500/50",   inactive: "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:border-amber-400" },
            ] as const).map(({ key, label, active, inactive }) => (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                  filterStatus === key
                    ? `${active} shadow-sm ring-2 ring-offset-1 ring-offset-[#1a0022]`
                    : inactive
                }`}
              >
                {filterStatus === key && <Check className="h-3 w-3 flex-shrink-0 opacity-80" />}
                {label}
              </button>
            ))}
            {(searchQuery || filterType !== "all" || filterStatus !== "all") && (
              <button
                onClick={() => { setSearchQuery(""); setFilterType("all"); setFilterStatus("all"); }}
                className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" /> Limpar
              </button>
            )}
          </div>
        </div>
      )}

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">Nenhuma atividade registrada ainda.</p>
          <p className="mt-2 text-xs text-gray-400">Adicione atividades para acompanhar o progresso deste lead.</p>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-gray-400">Nenhuma atividade encontrada para os filtros aplicados.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredActivities.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {filteredActivities.map((activity) => {
                const conn = threadConnectors.get(activity.id);
                return (
                  <SortableActivityItem
                    key={activity.id}
                    activity={activity}
                    isPending={isPending}
                    loadingId={loadingId}
                    handleToggle={handleToggle}
                    openOutcomeModal={openOutcomeModal}
                    handleRevert={handleRevert}
                    openAssignModal={openAssignModal}
                    openReplyModal={setReplyingToActivity}
                    onChangeOutcome={handleChangeOutcome}
                    onChangeContactType={handleChangeContactType}
                    getContactNames={getContactNames}
                    leadContacts={leadContacts}
                    typeConfig={typeConfig}
                    receivedThreadIds={receivedThreadIds}
                    hasPrev={conn?.hasPrev ?? false}
                    hasNext={conn?.hasNext ?? false}
                    isAdmin={isAdmin}
                    onPurged={() => router.refresh()}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Outcome Modal (Failed / Skipped) */}
      {outcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOutcomeModal(null)}>
          <div className="w-full max-w-sm rounded-xl bg-[#1a0022] shadow-2xl border border-[#3d2b4d]" onClick={(e) => e.stopPropagation()}>
            <div className={`flex items-center justify-between border-b p-4 text-white rounded-t-xl ${
              outcomeModal.type === "failed"
                ? "bg-gradient-to-r from-red-600 to-red-800"
                : "bg-gradient-to-r from-amber-500 to-amber-700"
            }`}>
              <h2 className="flex items-center gap-2 text-base font-bold">
                {outcomeModal.type === "failed" ? (
                  <>
                    <XCircle className="h-5 w-5" />
                    Marcar como Falha
                  </>
                ) : (
                  <>
                    <SkipForward className="h-5 w-5" />
                    Pular Atividade
                  </>
                )}
              </h2>
              <button onClick={() => setOutcomeModal(null)} className="rounded-lg p-1.5 hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              <p className="mb-1 text-sm font-medium text-gray-900 truncate">
                {outcomeModal.activity.subject}
              </p>
              <p className="mb-4 text-xs text-gray-500">
                {outcomeModal.type === "failed"
                  ? "Informe o que aconteceu (ex: email voltou, não atendeu, número errado)"
                  : "Informe o motivo para pular (ex: sem email cadastrado, sem telefone)"
                }
              </p>

              <textarea
                value={outcomeReason}
                onChange={(e) => setOutcomeReason(e.target.value)}
                rows={3}
                autoFocus
                placeholder={
                  outcomeModal.type === "failed"
                    ? "Email voltou - endereço inválido..."
                    : "Contato não tem email cadastrado..."
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex gap-3 border-t border-[#3d2b4d] bg-[#2d1b3d] px-4 py-3 rounded-b-xl">
              <button
                onClick={() => setOutcomeModal(null)}
                className="flex-1 rounded-lg border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-2 text-sm font-medium text-gray-300 hover:bg-[#3d2b4d]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitOutcome}
                disabled={outcomeLoading || !outcomeReason.trim()}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold text-white disabled:opacity-50 ${
                  outcomeModal.type === "failed"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {outcomeLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </span>
                ) : outcomeModal.type === "failed" ? (
                  "Marcar como Falha"
                ) : (
                  "Pular"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setReplyModal(false)}>
          <div className="w-full max-w-sm rounded-xl bg-[#1a0022] shadow-2xl border border-[#3d2b4d]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b p-4 text-white rounded-t-xl bg-gradient-to-r from-green-600 to-green-800">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <MessageCircleReply className="h-5 w-5" />
                Registrar Resposta do Lead
              </h2>
              <button onClick={() => setReplyModal(false)} className="rounded-lg p-1.5 hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <strong>Atenção:</strong> Ao registrar uma resposta, todas as cadências ativas serão canceladas e as atividades pendentes serão marcadas como puladas.
              </div>

              <label className="mb-1 block text-sm font-medium text-gray-700">
                Canal da resposta
              </label>
              <select
                value={replyChannel}
                onChange={(e) => setReplyChannel(e.target.value)}
                className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="email">E-mail</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="linkedin">LinkedIn</option>
                <option value="call">Ligação</option>
                <option value="instagram">Instagram</option>
                <option value="meeting">Reunião</option>
                <option value="other">Outro</option>
              </select>

              <label className="mb-1 block text-sm font-medium text-gray-700">
                Observações (opcional)
              </label>
              <textarea
                value={replyNotes}
                onChange={(e) => setReplyNotes(e.target.value)}
                rows={3}
                placeholder="Ex: Lead respondeu com interesse, quer agendar reunião..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex gap-3 border-t border-[#3d2b4d] bg-[#2d1b3d] px-4 py-3 rounded-b-xl">
              <button
                onClick={() => setReplyModal(false)}
                className="flex-1 rounded-lg border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-2 text-sm font-medium text-gray-300 hover:bg-[#3d2b4d]"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegisterReply}
                disabled={replyLoading}
                className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {replyLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registrando...
                  </span>
                ) : (
                  "Registrar Resposta"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gmail Reply Modal */}
      {replyingToActivity && replyingToActivity.emailFromAddress && (
        <GmailComposeModal
          to={replyingToActivity.emailFromAddress}
          name={replyingToActivity.emailFromName ?? replyingToActivity.emailFromAddress}
          leadId={leadId}
          threadId={replyingToActivity.emailThreadId ?? undefined}
          initialSubject={replyingToActivity.emailSubject ? `Re: ${replyingToActivity.emailSubject}` : undefined}
          onClose={() => { setReplyingToActivity(null); router.refresh(); }}
        />
      )}

      {/* Assign Contacts Modal */}
      {assigningActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setAssigningActivity(null)}>
          <div className="w-full max-w-sm rounded-xl bg-[#1a0022] shadow-2xl border border-[#3d2b4d]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b bg-gradient-to-r from-purple-600 to-purple-800 p-4 text-white rounded-t-xl">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <UserPlus className="h-5 w-5" />
                Associar Contatos
              </h2>
              <button onClick={() => setAssigningActivity(null)} className="rounded-lg p-1.5 hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              <p className="mb-3 text-sm text-gray-600 truncate">
                {assigningActivity.subject}
              </p>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {leadContacts.filter((c) => c.isActive).map((contact) => (
                  <label
                    key={contact.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      selectedContactIds.has(contact.id)
                        ? "border-purple-300 bg-purple-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedContactIds.has(contact.id)}
                      onChange={() => toggleContact(contact.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                      {contact.role && (
                        <p className="text-xs text-gray-500">{contact.role}</p>
                      )}
                    </div>
                    {contact.isPrimary && (
                      <span className="rounded bg-purple-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        Principal
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 border-t border-[#3d2b4d] bg-[#2d1b3d] px-4 py-3 rounded-b-xl">
              <button
                onClick={() => setAssigningActivity(null)}
                className="flex-1 rounded-lg border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-2 text-sm font-medium text-gray-300 hover:bg-[#3d2b4d]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveContacts}
                disabled={savingContacts}
                className="flex-1 rounded-lg bg-purple-600 px-3 py-2 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {savingContacts ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </span>
                ) : (
                  "Salvar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
