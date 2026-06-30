"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AlertTriangle, Check, Eye, EyeOff, GripVertical, Loader2, MousePointerClick, RotateCcw, SkipForward, UserPlus, Users, XCircle, Mail, Reply, Clock, Send } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDate, formatTime, formatRelativeTime } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import WhatsAppActivityLog from "@/components/whatsapp/WhatsAppActivityLog";
import PurgeActivityButton from "@/components/activities/PurgeActivityButton";
import { ActivityTypeIcon } from "./activity-icons";
import { GoToOutcomeBadge, GOTO_OUTCOME_OPTIONS } from "./goto-outcome";
import type { Activity, LeadContact, CallAnalysisSummary, MeetAnalysisSummary, GkAnalysisSummary } from "./activity-types";

const GoToCallPlayer = dynamic(() => import("@/components/activities/GoToCallPlayer"), { ssr: false });

export function SortableActivityItem({
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
  callAnalysis,
  meetAnalysis,
  hasMeetTranscript,
  gkAnalysis,
  token,
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
  callAnalysis?: CallAnalysisSummary;
  meetAnalysis?: MeetAnalysisSummary;
  hasMeetTranscript?: boolean;
  gkAnalysis?: GkAnalysisSummary;
  token?: string;
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
  const [scheduledAction, setScheduledAction] = useState<"send" | "cancel" | null>(null);
  const [meetAnalysisTriggering, setMeetAnalysisTriggering] = useState(false);
  const [gkAnalysisTriggering, setGkAnalysisTriggering] = useState(false);
  const [transferAnalysisTriggering, setTransferAnalysisTriggering] = useState(false);

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
              {/* Destinatário do e-mail de campanha */}
              {(activity.type === "email" || activity.type === "campaign_email") && activity.emailToAddress && !activity.emailFromAddress && (
                <span className="inline-flex items-center gap-1 rounded bg-gray-500/10 px-2 py-0.5 text-xs font-medium text-gray-400 border border-gray-500/20">
                  <Mail className="h-3 w-3" />
                  {activity.emailToAddress}
                </span>
              )}
              {/* Email tracking badges — outbound emails and campaign emails */}
              {(activity.type === "email" || activity.type === "campaign_email") && !activity.emailFromAddress && (activity.emailOpenCount ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 rounded bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-300 border border-indigo-500/30">
                  <Eye className="h-3 w-3" />
                  {(activity.emailOpenCount ?? 0) === 1 ? "Aberto" : `Aberto ${activity.emailOpenCount}×`}
                </span>
              )}
              {(activity.type === "email" || activity.type === "campaign_email") && !activity.emailFromAddress && !activity.failedAt && !activity.skippedAt && (activity.emailOpenCount ?? 0) === 0 && activity.completed && (
                <span className="inline-flex items-center gap-1 rounded bg-gray-500/10 px-2 py-0.5 text-xs font-medium text-gray-400 border border-gray-500/20">
                  <EyeOff className="h-3 w-3" />
                  Não abriu
                </span>
              )}
              {(activity.type === "email" || activity.type === "campaign_email") && !activity.emailFromAddress && (activity.emailLinkClickCount ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 rounded bg-teal-500/10 px-2 py-0.5 text-xs font-medium text-teal-300 border border-teal-500/30">
                  <MousePointerClick className="h-3 w-3" />
                  {(activity.emailLinkClickCount ?? 0) === 1 ? "Link clicado" : `${activity.emailLinkClickCount} cliques`}
                </span>
              )}
              {(activity.type === "email" || activity.type === "campaign_email") && !activity.emailFromAddress && !activity.failedAt && !activity.skippedAt && (activity.emailLinkClickCount ?? 0) === 0 && activity.completed && (
                <span className="inline-flex items-center gap-1 rounded bg-gray-500/10 px-2 py-0.5 text-xs font-medium text-gray-400 border border-gray-500/20">
                  <MousePointerClick className="h-3 w-3" />
                  Sem cliques
                </span>
              )}
              {(activity.type === "email" || activity.type === "campaign_email") && activity.failedAt && (
                <span className="inline-flex items-center gap-1 rounded bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-300 border border-red-500/30">
                  <XCircle className="h-3 w-3" />
                  Bounce
                </span>
              )}
              {(activity.type === "email" || activity.type === "campaign_email") && activity.skippedAt && (
                <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300 border border-amber-500/30">
                  <SkipForward className="h-3 w-3" />
                  Descadastrou
                </span>
              )}
              {activity.type === "email" && activity.scheduledSendAt && !activity.completed && !activity.failedAt && !activity.skippedAt && (
                <span className="inline-flex items-center gap-1.5 rounded bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-300 border border-purple-500/30">
                  <Clock className="h-3 w-3" />
                  Agendado para {formatDate(activity.scheduledSendAt)}
                  <button
                    type="button"
                    title="Enviar agora"
                    disabled={scheduledAction !== null || !token}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!token) return;
                      setScheduledAction("send");
                      try {
                        await apiFetch(`/email/scheduled/by-activity/${activity.id}/send-now`, token, { method: "POST" });
                        toast.success("E-mail enviado");
                        onPurged();
                      } catch {
                        toast.error("Erro ao enviar o e-mail agendado");
                        setScheduledAction(null);
                      }
                    }}
                    className="ml-1 inline-flex items-center gap-0.5 rounded border border-purple-500/40 px-1.5 py-0.5 text-purple-200 hover:bg-purple-500/20 disabled:opacity-50"
                  >
                    {scheduledAction === "send" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    Enviar agora
                  </button>
                  <button
                    type="button"
                    title="Cancelar envio"
                    disabled={scheduledAction !== null || !token}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!token) return;
                      setScheduledAction("cancel");
                      try {
                        await apiFetch(`/email/scheduled/by-activity/${activity.id}`, token, { method: "DELETE" });
                        toast.success("Envio cancelado");
                        onPurged();
                      } catch {
                        toast.error("Erro ao cancelar o envio");
                        setScheduledAction(null);
                      }
                    }}
                    className="inline-flex items-center gap-0.5 rounded border border-gray-500/40 px-1.5 py-0.5 text-gray-300 hover:bg-gray-500/20 disabled:opacity-50"
                  >
                    {scheduledAction === "cancel" ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                    Cancelar
                  </button>
                </span>
              )}
              {(activity.type === "email" || activity.type === "campaign_email") && (activity.clickUrls ?? []).length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(activity.clickUrls ?? []).map((cu) => (
                    <span
                      key={cu.url}
                      className="inline-flex items-center gap-1 rounded bg-teal-500/10 px-2 py-0.5 text-xs font-medium text-teal-300 border border-teal-500/20 max-w-[260px]"
                      title={cu.url}
                    >
                      <MousePointerClick className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{cu.url.replace(/^https?:\/\//, "")}</span>
                      <span className="ml-0.5 font-bold">{cu.count}×</span>
                    </span>
                  ))}
                </div>
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
                  ) : activity.callContactType === "transfer" ? (
                    <span className="inline-flex items-center gap-1 rounded bg-cyan-100 px-2 py-0.5 text-xs font-medium text-cyan-700">
                      🔄 Transferência
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      🚧 Gatekeeper
                    </span>
                  )}
                </button>
                {contactTypePickerOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 min-w-[150px] rounded-lg border border-[#3d2b4d] bg-[#1a0022] shadow-lg">
                    {[{ value: "gatekeeper", label: "🚧 Gatekeeper" }, { value: "decisor", label: "🎯 Decisor" }, { value: "transfer", label: "🔄 Transferência (GK → Decisor)" }].map((opt) => (
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

          {/* SPICED analysis badge — fora do Link (not shown for transfer; handled in combined block) */}
          {callAnalysis && activity.callContactType !== "transfer" && callAnalysis.status === "completed" && (
            <Link
              href={`/call-analyses/${callAnalysis.id}`}
              className="mt-1.5 inline-flex items-center gap-1.5 rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700 hover:bg-purple-200 transition-colors"
            >
              🧠 SPICED{callAnalysis.score !== null ? ` · ${callAnalysis.score}/100` : ""}
            </Link>
          )}
          {callAnalysis && activity.callContactType !== "transfer" && callAnalysis.status === "pending" && (
            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
              🧠 Análise pendente
            </span>
          )}
          {callAnalysis && activity.callContactType !== "transfer" && callAnalysis.status === "processing" && (
            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600">
              🧠 Analisando…
            </span>
          )}

          {/* DIAG meet analysis — toggle (somente com transcrição) ou badge (quando pronto) */}
          {activity.type === "meeting" && (() => {
            if (meetAnalysis?.status === "completed") {
              return (
                <Link
                  href={`/meet-analyses/${meetAnalysis.id}`}
                  className="mt-1.5 inline-flex items-center gap-1.5 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-200 transition-colors"
                >
                  🎯 DIAG{meetAnalysis.score !== null ? ` · ${meetAnalysis.score}/5` : ""}
                </Link>
              );
            }
            if (meetAnalysis?.status === "pending" || meetAnalysis?.status === "processing" || meetAnalysisTriggering) {
              return (
                <span className="mt-1.5 inline-flex items-center gap-1.5 rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                  <Loader2 className="h-3 w-3 animate-spin" /> Analisando reunião…
                </span>
              );
            }
            if (hasMeetTranscript && !meetAnalysis) {
              return (
                <div
                  className="mt-1.5 inline-flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-xs text-gray-400">Analisar com DIAG</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={meetAnalysisTriggering}
                    disabled={meetAnalysisTriggering}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!token) return;
                      setMeetAnalysisTriggering(true);
                      try {
                        await apiFetch(`/meet-analysis/trigger-by-activity/${activity.id}`, token, { method: "POST" });
                        toast.success("Análise DIAG iniciada");
                      } catch {
                        toast.error("Erro ao iniciar análise DIAG");
                        setMeetAnalysisTriggering(false);
                      }
                    }}
                    className="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-300 transition-colors duration-200 ease-in-out focus:outline-none hover:bg-amber-300 disabled:opacity-50"
                  >
                    <span className="pointer-events-none inline-block h-4 w-4 translate-x-0 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
                  </button>
                </div>
              );
            }
            return null;
          })()}

          {/* RAPORT gatekeeper analysis — toggle (somente com transcrição) ou badge (quando pronto) */}
          {activity.gotoCallId && activity.callContactType === "gatekeeper" && (() => {
            if (gkAnalysis?.status === "completed") {
              return (
                <Link
                  href={`/gk-analyses/${gkAnalysis.id}`}
                  className="mt-1.5 inline-flex items-center gap-1.5 rounded bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800 hover:bg-orange-200 transition-colors"
                >
                  🚧 RAPORT{gkAnalysis.score !== null ? ` · ${gkAnalysis.score}/5` : ""}
                </Link>
              );
            }
            if (gkAnalysis?.status === "pending" || gkAnalysis?.status === "processing" || gkAnalysisTriggering) {
              return (
                <span className="mt-1.5 inline-flex items-center gap-1.5 rounded bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">
                  <Loader2 className="h-3 w-3 animate-spin" /> Analisando GK…
                </span>
              );
            }
            if (activity.gotoTranscriptText && !gkAnalysis) {
              return (
                <div
                  className="mt-1.5 inline-flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-xs text-gray-400">Analisar com RAPORT</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={gkAnalysisTriggering}
                    disabled={gkAnalysisTriggering}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!token) return;
                      setGkAnalysisTriggering(true);
                      try {
                        await apiFetch(`/gatekeeper-analysis/trigger-by-activity/${activity.id}`, token, { method: "POST" });
                        toast.success("Análise RAPORT iniciada");
                      } catch {
                        toast.error("Erro ao iniciar análise RAPORT");
                        setGkAnalysisTriggering(false);
                      }
                    }}
                    className="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-300 transition-colors duration-200 ease-in-out focus:outline-none hover:bg-orange-300 disabled:opacity-50"
                  >
                    <span className="pointer-events-none inline-block h-4 w-4 translate-x-0 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
                  </button>
                </div>
              );
            }
            return null;
          })()}

          {/* Transfer Analysis — GK + SPICED combo (para ligações com transferência GK → Decisor) */}
          {activity.gotoCallId && activity.callContactType === "transfer" && (() => {
            const gkDone = gkAnalysis?.status === "completed";
            const spicedDone = callAnalysis?.status === "completed";
            const anyRunning =
              (gkAnalysis?.status === "pending" || gkAnalysis?.status === "processing") ||
              (callAnalysis?.status === "pending" || callAnalysis?.status === "processing");

            if (gkDone || spicedDone) {
              return (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {gkDone && (
                    <Link
                      href={`/gk-analyses/${gkAnalysis!.id}`}
                      className="inline-flex items-center gap-1.5 rounded bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800 hover:bg-orange-200 transition-colors"
                    >
                      🚧 RAPORT{gkAnalysis!.score !== null ? ` · ${gkAnalysis!.score}/5` : ""}
                    </Link>
                  )}
                  {spicedDone && (
                    <Link
                      href={`/call-analyses/${callAnalysis!.id}`}
                      className="inline-flex items-center gap-1.5 rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700 hover:bg-purple-200 transition-colors"
                    >
                      🧠 SPICED{callAnalysis!.score !== null ? ` · ${callAnalysis!.score}/100` : ""}
                    </Link>
                  )}
                </div>
              );
            }

            if (anyRunning || transferAnalysisTriggering) {
              return (
                <span className="mt-1.5 inline-flex items-center gap-1.5 rounded bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-700">
                  <Loader2 className="h-3 w-3 animate-spin" /> Analisando transferência…
                </span>
              );
            }

            if (activity.gotoTranscriptText && !gkAnalysis && !callAnalysis) {
              return (
                <div
                  className="mt-1.5 inline-flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-xs text-gray-400">Analisar transferência</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={transferAnalysisTriggering}
                    disabled={transferAnalysisTriggering}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!token) return;
                      setTransferAnalysisTriggering(true);
                      try {
                        await apiFetch(`/transfer-analysis/trigger-by-activity/${activity.id}`, token, { method: "POST" });
                        toast.success("Análise de transferência iniciada");
                      } catch {
                        toast.error("Erro ao iniciar análise de transferência");
                        setTransferAnalysisTriggering(false);
                      }
                    }}
                    className="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-300 transition-colors duration-200 ease-in-out focus:outline-none hover:bg-cyan-300 disabled:opacity-50"
                  >
                    <span className="pointer-events-none inline-block h-4 w-4 translate-x-0 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
                  </button>
                </div>
              );
            }

            return null;
          })()}

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

