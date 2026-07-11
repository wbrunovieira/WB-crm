"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, SkipForward, X, XCircle, Clock, Search, RefreshCcw } from "lucide-react";
import dynamic from "next/dynamic";
const GmailComposeModal = dynamic(() => import("@/components/gmail/GmailComposeModal"), { ssr: false });
import { formatDate } from "@/lib/utils";
import { useToggleActivityCompleted, useMarkActivityFailed, useMarkActivitySkipped, useRevertActivityOutcome, useUpdateActivity } from "@/hooks/activities/use-activities";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

import type {
  Activity,
  CallAnalysisSummary,
  MeetAnalysisSummary,
  GkAnalysisSummary,
} from "../leads/activities/activity-types";
import { ActivityTypeIcon } from "../leads/activities/activity-icons";
import { groupUnproductiveCalls, CallGroupCard } from "../leads/activities/call-grouping";
import { SortableActivityItem } from "../leads/activities/SortableActivityItem";

/**
 * Rich activities timeline for the Partner page — a leaner sibling of LeadActivitiesList.
 * It reuses the same activity item, grouping and analysis rendering so a partner's timeline
 * looks identical to a lead's, but drops the lead-only concerns: cadence "register reply",
 * manual drag ordering, and lead-contact assignment (those don't apply to partners).
 */
export function PartnerActivitiesList({
  partnerId,
  activities,
  callAnalysesMap = {},
  meetAnalysesMap = {},
  meetTranscriptActivityIds,
  gkAnalysesMap = {},
}: {
  partnerId: string;
  activities: Activity[];
  callAnalysesMap?: Record<string, CallAnalysisSummary>;
  meetAnalysesMap?: Record<string, MeetAnalysisSummary>;
  meetTranscriptActivityIds?: Set<string>;
  gkAnalysesMap?: Record<string, GkAnalysisSummary>;
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
  const [outcomeModal, setOutcomeModal] = useState<{ activity: Activity; type: "failed" | "skipped" } | null>(null);
  const [outcomeReason, setOutcomeReason] = useState("");
  const [outcomeLoading, setOutcomeLoading] = useState(false);
  const [replyingToActivity, setReplyingToActivity] = useState<Activity | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showSkipped, setShowSkipped] = useState(false);
  const [completionModal, setCompletionModal] = useState<{ activity: Activity; candidates: Activity[] } | null>(null);
  const [completionLinkedId, setCompletionLinkedId] = useState<string | null>(null);
  const [syncingGoTo, setSyncingGoTo] = useState(false);

  const handleGoToSync = async () => {
    if (!token || syncingGoTo) return;
    setSyncingGoTo(true);
    try {
      const result = await apiFetch<{ fetched: number; created: number; skipped: number }>(
        "/goto/quick-sync",
        token,
        { method: "POST" },
      );
      if (result.created > 0) {
        toast.success(`GoTo sincronizado — ${result.created} ligaç${result.created === 1 ? "ão" : "ões"} adicionada${result.created === 1 ? "" : "s"}`);
        router.refresh();
      } else {
        toast.info("GoTo sincronizado — nenhuma ligação nova");
      }
    } catch {
      toast.error("Erro ao sincronizar GoTo");
    } finally {
      setSyncingGoTo(false);
    }
  };

  // Poll for pending/processing call analyses and notify when completed
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const pendingIds = Object.entries(callAnalysesMap)
      .filter(([, a]) => a.status === "pending" || a.status === "processing")
      .map(([activityId]) => activityId);

    if (pendingIds.length === 0) return;

    pollRef.current = setInterval(async () => {
      try {
        const results = await Promise.all(
          pendingIds.map((actId) =>
            apiFetch<{ id: string; status: string; score: number | null }>(
              `/call-analysis/by-activity/${actId}`,
              token,
            ).catch(() => null),
          ),
        );
        let anyCompleted = false;
        for (const result of results) {
          if (!result) continue;
          if (result.status === "completed" && !completedRef.current.has(result.id)) {
            completedRef.current.add(result.id);
            anyCompleted = true;
          }
        }
        if (anyCompleted) {
          toast.success("🧠 Análise SPICED concluída!");
          router.refresh();
          clearInterval(pollRef.current!);
          pollRef.current = null;
        }
      } catch {
        // silently ignore poll errors
      }
    }, 6000);

    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [callAnalysesMap, token, router]);

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

  const typeConfig: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
    call:           { label: "Ligação",        bg: "bg-violet-100",  text: "text-violet-800", border: "border-l-violet-500",  dot: "bg-violet-500" },
    meeting:        { label: "Reunião",        bg: "bg-amber-100",   text: "text-amber-800",  border: "border-l-amber-500",   dot: "bg-amber-500" },
    email:          { label: "E-mail",         bg: "bg-blue-100",    text: "text-blue-800",   border: "border-l-blue-500",    dot: "bg-blue-500" },
    campaign_email: { label: "E-mail Campanha",bg: "bg-indigo-100",  text: "text-indigo-800", border: "border-l-indigo-500",  dot: "bg-indigo-500" },
    task:           { label: "Tarefa",         bg: "bg-slate-100",   text: "text-slate-700",  border: "border-l-slate-400",   dot: "bg-slate-400" },
    whatsapp:       { label: "WhatsApp",     bg: "bg-[#25D366]",  text: "text-white",      border: "border-l-emerald-500", dot: "bg-emerald-500" },
    linkedin:       { label: "LinkedIn",     bg: "bg-sky-600",    text: "text-white",      border: "border-l-sky-600",     dot: "bg-sky-600" },
    instagram_dm:   { label: "Instagram DM",bg: "bg-pink-500",   text: "text-white",      border: "border-l-pink-500",    dot: "bg-pink-500" },
    instagram:      { label: "Instagram",    bg: "bg-pink-500",   text: "text-white",      border: "border-l-pink-500",    dot: "bg-pink-500" },
    physical_visit: { label: "Visita",       bg: "bg-teal-100",   text: "text-teal-800",   border: "border-l-teal-500",    dot: "bg-teal-500" },
  };

  const isPending = (a: Activity) => !a.completed && !a.failedAt && !a.skippedAt;

  const handleToggle = (e: React.MouseEvent, activityId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const act = activities.find((a) => a.id === activityId);

    // When completing a pending activity, offer to link it to an executed activity of the same type
    if (act && !act.completed && !act.failedAt && !act.skippedAt) {
      const candidates = activities
        .filter((a) =>
          a.id !== activityId &&
          a.type === act.type &&
          !(!a.completed && !a.failedAt && !a.skippedAt) && // not pending
          !a.skippedAt // skipped doesn't count as "executed"
        )
        .sort((a, b) => {
          const aD = new Date(a.completedAt ?? a.failedAt ?? a.dueDate ?? 0).getTime();
          const bD = new Date(b.completedAt ?? b.failedAt ?? b.dueDate ?? 0).getTime();
          return bD - aD;
        })
        .slice(0, 8);

      if (candidates.length > 0) {
        setCompletionLinkedId(null);
        setCompletionModal({ activity: act, candidates });
        return;
      }
    }

    setLoadingId(activityId);
    toggleCompleted.mutate(activityId, {
      onSuccess: () => router.refresh(),
      onSettled: () => setLoadingId(null),
    });
  };

  const handleCompleteWithLink = () => {
    if (!completionModal) return;
    const activityId = completionModal.activity.id;
    setCompletionModal(null);
    setLoadingId(activityId);
    toggleCompleted.mutate(activityId, {
      onSuccess: () => router.refresh(),
      onSettled: () => { setLoadingId(null); setCompletionLinkedId(null); },
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

  // Partners have no lead-contact assignment; keep the item's assign UI hidden by feeding empties.
  const noop = () => {};
  const getContactNames = (): string[] => [];

  // Pending first, then done ordered by completion/fail/skip date (most recent first)
  const displayActivities = useMemo(() => {
    const pending = activities.filter(isPending);
    const done = [...activities]
      .filter((a) => !isPending(a))
      .sort((a, b) => {
        const aRaw = a.completedAt ?? a.failedAt ?? a.skippedAt;
        const aDate = aRaw ? new Date(aRaw).getTime() : 0;
        const bRaw = b.completedAt ?? b.failedAt ?? b.skippedAt;
        const bDate = bRaw ? new Date(bRaw).getTime() : 0;
        return bDate - aDate;
      });
    return [...pending, ...done];
  }, [activities]);

  // Filter by search + type + status
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

  const pendingFiltered         = useMemo(() => filteredActivities.filter(isPending), [filteredActivities]);
  const doneFiltered            = useMemo(() => filteredActivities.filter((a) => !isPending(a)), [filteredActivities]);
  const nonSkippedDoneFiltered  = useMemo(() => doneFiltered.filter((a) => !a.skippedAt), [doneFiltered]);
  const skippedDoneFiltered     = useMemo(() => doneFiltered.filter((a) => !!a.skippedAt), [doneFiltered]);

  function buildThreadConnectors(list: Activity[]) {
    const map = new Map<string, { hasPrev: boolean; hasNext: boolean }>();
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!a.emailThreadId) continue;
      const prev = list[i - 1];
      const next = list[i + 1];
      const hasPrev = prev?.emailThreadId === a.emailThreadId;
      const hasNext = next?.emailThreadId === a.emailThreadId;
      if (hasPrev || hasNext) map.set(a.id, { hasPrev, hasNext });
    }
    return map;
  }

  const pendingThreadConnectors  = useMemo(() => buildThreadConnectors(pendingFiltered), [pendingFiltered]);
  const doneThreadConnectors     = useMemo(() => buildThreadConnectors(nonSkippedDoneFiltered), [nonSkippedDoneFiltered]);
  const skippedThreadConnectors  = useMemo(() => buildThreadConnectors(skippedDoneFiltered), [skippedDoneFiltered]);

  const pendingRenderItems  = useMemo(() => groupUnproductiveCalls(pendingFiltered), [pendingFiltered]);
  const doneRenderItems     = useMemo(() => groupUnproductiveCalls(nonSkippedDoneFiltered), [nonSkippedDoneFiltered]);
  const skippedRenderItems  = useMemo(() => groupUnproductiveCalls(skippedDoneFiltered), [skippedDoneFiltered]);

  // Received e-mail threads — enables the "reply" affordance on inbound e-mail activities
  const receivedThreadIds = useMemo(
    () =>
      new Set(
        activities
          .filter((a) => a.type === "email" && a.emailFromAddress && a.emailThreadId)
          .map((a) => a.emailThreadId!)
      ),
    [activities]
  );

  // Shared props for every activity item (partners: no drag handle, no contact assignment)
  const itemProps = (activity: Activity, conn?: { hasPrev: boolean; hasNext: boolean }) => ({
    activity,
    isPending,
    loadingId,
    handleToggle,
    openOutcomeModal,
    handleRevert,
    openAssignModal: noop,
    openReplyModal: setReplyingToActivity,
    onChangeOutcome: handleChangeOutcome,
    onChangeContactType: handleChangeContactType,
    getContactNames,
    leadContacts: [],
    typeConfig,
    receivedThreadIds,
    hasPrev: conn?.hasPrev ?? false,
    hasNext: conn?.hasNext ?? false,
    isAdmin,
    onPurged: () => router.refresh(),
    callAnalysis: callAnalysesMap?.[activity.id],
    meetAnalysis: meetAnalysesMap?.[activity.id],
    hasMeetTranscript: meetTranscriptActivityIds?.has(activity.id),
    gkAnalysis: gkAnalysesMap?.[activity.id],
    token,
    sortable: false,
  });

  const renderColumn = (
    renderItems: ReturnType<typeof groupUnproductiveCalls>,
    connectors: Map<string, { hasPrev: boolean; hasNext: boolean }>,
  ) =>
    renderItems.map((item) => {
      if (item.kind === "group") {
        const groupKey = item.activities[0].id;
        const expanded = expandedGroups.has(groupKey);
        return (
          <CallGroupCard
            key={groupKey}
            activities={item.activities}
            expanded={expanded}
            onToggle={() =>
              setExpandedGroups((prev) => {
                const next = new Set(prev);
                if (next.has(groupKey)) { next.delete(groupKey); } else { next.add(groupKey); }
                return next;
              })
            }
            renderItem={(activity) => (
              <SortableActivityItem key={activity.id} {...itemProps(activity, connectors.get(activity.id))} />
            )}
          />
        );
      }
      const activity = item.activity;
      return (
        <SortableActivityItem key={activity.id} {...itemProps(activity, connectors.get(activity.id))} />
      );
    });

  return (
    <div id="atividades" className="scroll-mt-52 rounded-xl bg-[#1a0022] p-6 shadow-md">
      <div className="mb-5 flex items-center justify-between pb-3 border-b-2 border-[#3d2b4d]">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">📅</span>
          Atividades ({activities.length})
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGoToSync}
            disabled={syncingGoTo}
            title="Sincronizar ligações recentes do GoTo"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-purple-500/40 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-300 hover:bg-purple-500/20 hover:border-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {syncingGoTo
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <RefreshCcw className="h-4 w-4" />}
            Sincronizar GoTo
          </button>
          <Link
            href={`/activities/new?partnerId=${partnerId}&returnTo=/partners/${partnerId}`}
            className="inline-flex items-center gap-2 rounded-lg bg-[#792990] px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            <span className="text-lg text-white">+</span>
            Adicionar Atividade
          </Link>
        </div>
      </div>

      {/* Activity stats summary */}
      {activities.length > 0 && (() => {
        const callActivities = activities.filter((a) => a.type === "call");
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

      {/* Search + filters */}
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
          <p className="mt-2 text-xs text-gray-400">Adicione atividades para acompanhar o relacionamento com este parceiro.</p>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-gray-400">Nenhuma atividade encontrada para os filtros aplicados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">

          {/* ── Left column: Pending ────────────────────────────────────── */}
          <div>
            <div className="mb-2 flex items-center gap-2 border-b border-blue-500/30 pb-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-semibold text-blue-300">Pendentes</span>
              <span className="rounded-full bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-xs font-semibold text-blue-300">
                {pendingFiltered.length}
              </span>
            </div>
            {pendingFiltered.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">Nenhuma atividade pendente.</p>
            ) : (
              <div className="space-y-3">
                {renderColumn(pendingRenderItems, pendingThreadConnectors)}
              </div>
            )}
          </div>

          {/* ── Right column: Done ──────────────────────────────────────── */}
          <div>
            <div className="mb-2 flex items-center gap-2 border-b border-green-500/30 pb-2">
              <Check className="h-4 w-4 text-green-400" />
              <span className="text-sm font-semibold text-green-300">Concluídas</span>
              <span className="rounded-full bg-green-500/15 border border-green-500/30 px-2 py-0.5 text-xs font-semibold text-green-300">
                {nonSkippedDoneFiltered.length}
              </span>
              {skippedDoneFiltered.length > 0 && (
                <button
                  onClick={() => setShowSkipped((v) => !v)}
                  className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                    showSkipped
                      ? "border-amber-400 bg-amber-500/25 text-amber-200"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                  }`}
                  title={showSkipped ? "Ocultar puladas" : "Mostrar puladas"}
                >
                  <SkipForward className="h-3 w-3" />
                  Puladas {skippedDoneFiltered.length}
                </button>
              )}
            </div>
            {nonSkippedDoneFiltered.length === 0 && !showSkipped ? (
              <p className="py-6 text-center text-sm text-gray-500">Nenhuma atividade concluída.</p>
            ) : (
              <div className="space-y-3">
                {renderColumn(doneRenderItems, doneThreadConnectors)}

                {/* Skipped section (collapsible) */}
                {showSkipped && skippedDoneFiltered.length > 0 && (
                  <div className="mt-4 border-t border-amber-500/20 pt-3 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                      <SkipForward className="h-3 w-3" />
                      Puladas ({skippedDoneFiltered.length})
                    </div>
                    {renderColumn(skippedRenderItems, skippedThreadConnectors)}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Completion linking modal */}
      {completionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setCompletionModal(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[#3d2b4d] bg-[#1a0022] shadow-2xl flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#3d2b4d] px-5 py-4 flex-shrink-0">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Check className="h-4 w-4 text-green-400" />
                Concluir atividade
              </h2>
              <button onClick={() => setCompletionModal(null)} className="rounded p-1 text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
                <p className="text-xs font-medium text-green-400 mb-0.5">
                  {typeConfig[completionModal.activity.type]?.label ?? completionModal.activity.type}
                </p>
                <p className="text-sm font-semibold text-white truncate">
                  {completionModal.activity.subject}
                </p>
                {completionModal.activity.dueDate && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Vencimento: {formatDate(completionModal.activity.dueDate)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-300">
                  Vincular à atividade executada{" "}
                  <span className="font-normal text-gray-500">(opcional)</span>
                </p>
                <p className="text-xs text-gray-500">
                  Selecione se essa atividade planejada foi realizada via uma das atividades abaixo. Caso contrário, conclua sem vincular.
                </p>

                <div className="space-y-1.5">
                  <button
                    onClick={() => setCompletionLinkedId(null)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 text-xs transition-colors ${
                      completionLinkedId === null
                        ? "border-purple-500 bg-purple-500/20 text-white"
                        : "border-[#3d2b4d] bg-[#2d1b3d] text-gray-400 hover:border-[#5a3a70] hover:text-gray-300"
                    }`}
                  >
                    <span className="font-medium">Nenhuma — concluir sem vincular</span>
                  </button>

                  {completionModal.candidates.map((candidate) => {
                    const dateRef = candidate.completedAt ?? candidate.failedAt ?? candidate.dueDate;
                    return (
                      <button
                        key={candidate.id}
                        onClick={() => setCompletionLinkedId(candidate.id)}
                        className={`w-full text-left rounded-lg border px-3 py-2.5 text-xs transition-colors ${
                          completionLinkedId === candidate.id
                            ? "border-purple-500 bg-purple-500/20 text-white"
                            : "border-[#3d2b4d] bg-[#2d1b3d] text-gray-400 hover:border-[#5a3a70] hover:text-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            typeConfig[candidate.type]
                              ? `${typeConfig[candidate.type].bg} ${typeConfig[candidate.type].text}`
                              : "bg-gray-700 text-gray-300"
                          }`}>
                            {typeConfig[candidate.type]?.label ?? candidate.type}
                          </span>
                          {dateRef && (
                            <span className="text-gray-500">{formatDate(dateRef)}</span>
                          )}
                          {candidate.gotoCallId && candidate.gotoCallOutcome && (
                            <span className="text-gray-500 capitalize">· {candidate.gotoCallOutcome.replace("_", " ")}</span>
                          )}
                        </div>
                        <p className="font-medium text-gray-200 truncate">{candidate.subject}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#3d2b4d] px-5 py-4 flex-shrink-0">
              <button
                onClick={() => setCompletionModal(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCompleteWithLink}
                className="flex items-center gap-1.5 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 transition-colors"
              >
                <Check className="h-4 w-4" />
                {completionLinkedId ? "Concluir vinculando" : "Concluir"}
              </button>
            </div>
          </div>
        </div>
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

      {/* Gmail Reply Modal (reply to a received e-mail) */}
      {replyingToActivity && replyingToActivity.emailFromAddress && (
        <GmailComposeModal
          to={replyingToActivity.emailFromAddress}
          name={replyingToActivity.emailFromName ?? replyingToActivity.emailFromAddress}
          partnerId={partnerId}
          threadId={replyingToActivity.emailThreadId ?? undefined}
          initialSubject={replyingToActivity.emailSubject ? `Re: ${replyingToActivity.emailSubject}` : undefined}
          onClose={() => { setReplyingToActivity(null); router.refresh(); }}
        />
      )}
    </div>
  );
}
