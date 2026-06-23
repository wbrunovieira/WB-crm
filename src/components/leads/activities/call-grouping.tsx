import type { ReactNode } from "react";
import { Phone } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Activity } from "./activity-types";

export const UNPRODUCTIVE_OUTCOMES = new Set(["no_answer", "busy", "rejected"]);

export function isUnproductiveGoto(a: { gotoCallId?: string | null; completed: boolean; gotoCallOutcome?: string | null }): boolean {
  return !!a.gotoCallId && a.completed && UNPRODUCTIVE_OUTCOMES.has(a.gotoCallOutcome ?? "");
}

export type RenderItem =
  | { kind: "single"; activity: Activity }
  | { kind: "group"; activities: Activity[] };

export function groupUnproductiveCalls(acts: Activity[]): RenderItem[] {
  const result: RenderItem[] = [];
  let i = 0;
  while (i < acts.length) {
    const a = acts[i];
    if (isUnproductiveGoto(a)) {
      const run: Activity[] = [a];
      while (i + 1 < acts.length && isUnproductiveGoto(acts[i + 1])) {
        i++;
        run.push(acts[i]);
      }
      if (run.length >= 2) {
        result.push({ kind: "group", activities: run });
      } else {
        result.push({ kind: "single", activity: run[0] });
      }
    } else {
      result.push({ kind: "single", activity: a });
    }
    i++;
  }
  return result;
}

const OUTCOME_LABEL: Record<string, string> = {
  no_answer: "Não atendeu",
  busy: "Ocupado",
  rejected: "Rejeitada",
};

export function CallGroupCard({
  activities,
  expanded,
  onToggle,
  renderItem,
}: {
  activities: Activity[];
  expanded: boolean;
  onToggle: () => void;
  renderItem: (a: Activity) => ReactNode;
}) {
  const counts: Record<string, number> = {};
  for (const a of activities) {
    const k = a.gotoCallOutcome ?? "unknown";
    counts[k] = (counts[k] ?? 0) + 1;
  }
  const breakdown = Object.entries(counts)
    .map(([k, n]) => `${n}× ${OUTCOME_LABEL[k] ?? k}`)
    .join(" · ");

  const first = activities[activities.length - 1];
  const last = activities[0];
  const dateRange = `${formatDate(first.completedAt ?? first.dueDate)} – ${formatDate(last.completedAt ?? last.dueDate)}`;

  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/5">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-red-500/10 rounded-xl transition-colors"
      >
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-400">
          <Phone className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold text-red-300">
            {activities.length} tentativas sem resposta
          </span>
          <span className="ml-2 text-xs text-red-400/70">{breakdown}</span>
          <p className="text-xs text-gray-500 mt-0.5">{dateRange}</p>
        </div>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-red-500/20 px-2 py-2 space-y-2">
          {activities.map((a) => renderItem(a))}
        </div>
      )}
    </div>
  );
}
