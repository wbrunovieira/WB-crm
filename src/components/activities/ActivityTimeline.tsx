import { formatDate } from "@/lib/utils";
import ActivityTypeIcon from "./ActivityTypeIcon";
import Link from "next/link";
import { StageChangeItem } from "./StageChangeItem";

type Activity = {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  dueDate: Date | null;
  completed: boolean;
  createdAt: Date;
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
  changedAt: Date;
};

type TimelineItem =
  | { kind: "activity"; data: Activity; date: Date }
  | { kind: "stageChange"; data: StageChange; date: Date };

type ActivityTimelineProps = {
  activities: Activity[];
  stageChanges?: StageChange[];
  showLinks?: boolean;
};

export default function ActivityTimeline({
  activities,
  stageChanges = [],
  showLinks = true,
}: ActivityTimelineProps) {
  // Merge and sort chronologically (newest first)
  const items: TimelineItem[] = [
    ...activities.map((a) => ({
      kind: "activity" as const,
      data: a,
      date: new Date(a.createdAt),
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
              {idx !== items.length - 1 ? (
                <span
                  className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              ) : null}

              {item.kind === "activity" ? (
                <ActivityItem
                  activity={item.data}
                  showLinks={showLinks}
                />
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

function ActivityItem({
  activity,
  showLinks,
}: {
  activity: Activity;
  showLinks: boolean;
}) {
  return (
    <div className="relative flex items-start space-x-3">
      <div className="relative">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ring-8 ring-white ${
            activity.completed ? "bg-green-500" : "bg-gray-100"
          }`}
        >
          {activity.completed ? (
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <ActivityTypeIcon type={activity.type} />
          )}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/activities/${activity.id}`}
              className="text-sm font-medium text-gray-900 hover:text-primary"
            >
              {activity.subject}
            </Link>
            {activity.completed && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                Concluída
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-gray-500">
            {formatDate(activity.createdAt)}
            {activity.dueDate && (
              <span className="ml-2">
                • Vencimento: {formatDate(activity.dueDate)}
              </span>
            )}
          </p>
        </div>
        {activity.description && (
          <div className="mt-2 text-sm text-gray-700">
            <p>{activity.description}</p>
          </div>
        )}
        {showLinks && (activity.deal || activity.contact) && (
          <div className="mt-2 flex gap-4 text-sm">
            {activity.deal && (
              <Link
                href={`/deals/${activity.deal.id}`}
                className="text-primary hover:underline"
              >
                → {activity.deal.title}
              </Link>
            )}
            {activity.contact && (
              <Link
                href={`/contacts/${activity.contact.id}`}
                className="text-primary hover:underline"
              >
                → {activity.contact.name}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
