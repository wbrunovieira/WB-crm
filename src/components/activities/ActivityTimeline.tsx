"use client";

import { formatDate } from "@/lib/utils";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Link2 } from "lucide-react";
import { StageChangeItem } from "./StageChangeItem";
import WhatsAppMessageLog from "@/components/whatsapp/WhatsAppMessageLog";
import type { WhatsAppMediaMessage } from "@/components/whatsapp/WhatsAppMessageLog";

const GoToCallPlayer = dynamic(() => import("./GoToCallPlayer"), { ssr: false });
const LinkActivityToDealModal = dynamic(() => import("./LinkActivityToDealModal"), { ssr: false });

type Activity = {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  dueDate: Date | string | null;
  completed: boolean;
  completedAt?: Date | string | null;
  createdAt?: string | Date | null;
  gotoCallId?: string | null;
  gotoRecordingUrl?: string | null;
  gotoRecordingUrl2?: string | null;
  gotoTranscriptText?: string | null;
  additionalDealIds?: string | null;
  whatsappMessages?: WhatsAppMediaMessage[];
  deal?: {
    id: string;
    title: string;
  } | null;
  contact?: {
    id: string;
    name: string;
  } | null;
};

export type StageChange = {
  id: string;
  fromStage: { id: string; name: string } | null;
  toStage: { id: string; name: string };
  changedBy: { id: string; name: string | null; email: string };
  changedAt: string | Date;
};

type TimelineItem =
  | { kind: "activity"; data: Activity; date: Date }
  | { kind: "stageChange"; data: StageChange; date: Date };

type ActivityTimelineProps = {
  activities: Activity[];
  stageChanges?: StageChange[];
  showLinks?: boolean;
  currentDealId?: string;
};

// ─── Type config ─────────────────────────────────────────────────────────────
type TypeConfig = {
  circleBg: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
  descriptionBg: string;
  descriptionBorder: string;
};

const TYPE_CONFIG: Record<string, TypeConfig> = {
  email: {
    circleBg: "bg-blue-500",
    badge: "E-mail",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
    descriptionBg: "bg-blue-50",
    descriptionBorder: "border-blue-200",
  },
  call: {
    circleBg: "bg-violet-500",
    badge: "Ligação",
    badgeBg: "bg-violet-100",
    badgeText: "text-violet-700",
    descriptionBg: "bg-violet-50",
    descriptionBorder: "border-violet-200",
  },
  whatsapp: {
    circleBg: "bg-[#25D366]",
    badge: "WhatsApp",
    badgeBg: "bg-[#25D366]/15",
    badgeText: "text-[#075E54]",
    descriptionBg: "bg-[#f0fdf4]",
    descriptionBorder: "border-[#25D366]/20",
  },
  meeting: {
    circleBg: "bg-amber-500",
    badge: "Reunião",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    descriptionBg: "bg-amber-50",
    descriptionBorder: "border-amber-200",
  },
  task: {
    circleBg: "bg-slate-500",
    badge: "Tarefa",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-700",
    descriptionBg: "bg-slate-50",
    descriptionBorder: "border-slate-200",
  },
  instagram_dm: {
    circleBg: "bg-pink-500",
    badge: "Instagram DM",
    badgeBg: "bg-pink-100",
    badgeText: "text-pink-700",
    descriptionBg: "bg-pink-50",
    descriptionBorder: "border-pink-200",
  },
  physical_visit: {
    circleBg: "bg-teal-500",
    badge: "Visita",
    badgeBg: "bg-teal-100",
    badgeText: "text-teal-700",
    descriptionBg: "bg-teal-50",
    descriptionBorder: "border-teal-200",
  },
  linkedin: {
    circleBg: "bg-sky-600",
    badge: "LinkedIn",
    badgeBg: "bg-sky-100",
    badgeText: "text-sky-700",
    descriptionBg: "bg-sky-50",
    descriptionBorder: "border-sky-200",
  },
};

const DEFAULT_CONFIG: TypeConfig = {
  circleBg: "bg-gray-400",
  badge: "Atividade",
  badgeBg: "bg-gray-100",
  badgeText: "text-gray-600",
  descriptionBg: "bg-gray-50",
  descriptionBorder: "border-gray-200",
};

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconEmail() {
  return (
    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function IconCall() {
  return (
    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function IconMeeting() {
  return (
    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function IconTask() {
  return (
    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg className="h-5 w-5 fill-white" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function IconLinkedIn() {
  return (
    <svg className="h-5 w-5 fill-white" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

function IconVisit() {
  return (
    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconGoTo() {
  return (
    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function TypeIcon({ type, isGoto }: { type: string; isGoto: boolean }) {
  if (isGoto) return <IconGoTo />;
  switch (type) {
    case "email":        return <IconEmail />;
    case "call":         return <IconCall />;
    case "whatsapp":     return <IconWhatsApp />;
    case "meeting":      return <IconMeeting />;
    case "instagram_dm": return <IconInstagram />;
    case "linkedin":     return <IconLinkedIn />;
    case "physical_visit": return <IconVisit />;
    default:             return <IconTask />;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ActivityTimeline({
  activities,
  stageChanges = [],
  showLinks = true,
  currentDealId,
}: ActivityTimelineProps) {
  const items: TimelineItem[] = [
    ...activities.map((a) => ({
      kind: "activity" as const,
      data: a,
      date: new Date(a.createdAt ?? Date.now()),
    })),
    ...stageChanges.map((sc) => ({
      kind: "stageChange" as const,
      data: sc,
      date: new Date(sc.changedAt),
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  if (items.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-500">Nenhuma atividade registrada</p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {items.map((item, idx) => (
          <li key={item.kind === "activity" ? `a-${item.data.id}` : `sc-${item.data.id}`}>
            <div className="relative pb-8">
              {idx !== items.length - 1 && (
                <span
                  className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              )}
              {item.kind === "activity" ? (
                <ActivityItem activity={item.data} showLinks={showLinks} currentDealId={currentDealId} />
              ) : (
                <StageChangeItem stageChange={item.data} />
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Activity item ────────────────────────────────────────────────────────────
function ActivityItem({
  activity,
  showLinks,
  currentDealId,
}: {
  activity: Activity;
  showLinks: boolean;
  currentDealId?: string;
}) {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const isGoto = Boolean(activity.gotoCallId);
  const config = isGoto
    ? { ...DEFAULT_CONFIG, circleBg: "bg-blue-500", badge: "GoTo", badgeBg: "bg-blue-100", badgeText: "text-blue-700" }
    : (TYPE_CONFIG[activity.type] ?? DEFAULT_CONFIG);

  const completedDate = activity.completedAt ?? (activity.completed ? activity.dueDate : null);

  const parsedAdditionalDealIds: string[] = (() => {
    if (!activity.additionalDealIds) return [];
    try { return JSON.parse(activity.additionalDealIds); } catch { return []; }
  })();

  return (
    <div className="relative flex items-start space-x-3">
      {/* Icon circle */}
      <div className="relative shrink-0">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ring-4 ring-white ${config.circleBg}`}>
          <TypeIcon type={activity.type} isGoto={isGoto} />
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Header row: badges + subject */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type badge — always visible */}
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.badgeBg} ${config.badgeText}`}>
            {config.badge}
          </span>

          {/* Status badge */}
          {activity.completed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              {completedDate ? `Concluída em ${formatDate(completedDate)}` : "Concluída"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {activity.dueDate ? `Vence em ${formatDate(activity.dueDate)}` : "Agendada"}
            </span>
          )}
        </div>

        {/* Subject */}
        <div className="mt-1">
          <Link
            href={`/activities/${activity.id}`}
            className="text-sm font-medium text-gray-900 hover:text-primary"
          >
            {activity.subject}
          </Link>
        </div>

        {/* Meta: date */}
        <p className="mt-0.5 text-xs text-gray-400">
          {formatDate(activity.createdAt ?? null)}
          {!isGoto && activity.type !== "whatsapp" && activity.dueDate && !activity.completed && (
            <span className="ml-2">• Vencimento: {formatDate(activity.dueDate)}</span>
          )}
        </p>

        {/* Description */}
        {activity.description && !isGoto && (
          <div className={`mt-2 rounded-lg border p-3 text-sm text-gray-700 ${config.descriptionBg} ${config.descriptionBorder}`}>
            {activity.type === "whatsapp" ? (
              <WhatsAppMessageLog description={activity.description} mediaMessages={activity.whatsappMessages} previewCount={3} />
            ) : (
              <p className="whitespace-pre-line">{activity.description}</p>
            )}
          </div>
        )}

        {/* GoTo: dual-track player + attributed transcript */}
        {isGoto && activity.gotoRecordingUrl && (
          <div className="mt-2">
            <GoToCallPlayer
              activityId={activity.id}
              agentKey={activity.gotoRecordingUrl}
              clientKey={activity.gotoRecordingUrl2}
              transcriptText={activity.gotoTranscriptText}
            />
          </div>
        )}

        {/* Links */}
        {showLinks && (activity.deal || activity.contact) && (
          <div className="mt-2 flex gap-4 text-sm">
            {activity.deal && (
              <Link href={`/deals/${activity.deal.id}`} className="text-primary hover:underline">
                → {activity.deal.title}
              </Link>
            )}
            {activity.contact && (
              <Link href={`/contacts/${activity.contact.id}`} className="text-primary hover:underline">
                → {activity.contact.name}
              </Link>
            )}
          </div>
        )}

        {/* Deal linking — only shown on deal pages */}
        {currentDealId && (
          <div key={refreshKey} className="mt-2 flex flex-wrap items-center gap-2">
            {parsedAdditionalDealIds.map((dealId) => (
              <span
                key={dealId}
                className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700"
              >
                <Link2 className="h-3 w-3" />
                Negócio vinculado
              </span>
            ))}
            <button
              onClick={(e) => { e.preventDefault(); setLinkModalOpen(true); }}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2.5 py-0.5 text-xs font-medium text-gray-500 hover:border-primary hover:text-primary transition-colors"
              title="Vincular a outro negócio"
            >
              <Link2 className="h-3 w-3" />
              Vincular a negócio
            </button>
          </div>
        )}

        {linkModalOpen && currentDealId && (
          <LinkActivityToDealModal
            activityId={activity.id}
            activitySubject={activity.subject}
            currentDealId={currentDealId}
            additionalDealIds={parsedAdditionalDealIds}
            onClose={() => setLinkModalOpen(false)}
            onChanged={() => setRefreshKey((k) => k + 1)}
          />
        )}
      </div>
    </div>
  );
}
