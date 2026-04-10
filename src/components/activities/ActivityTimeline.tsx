import { formatDate } from "@/lib/utils";
import ActivityTypeIcon from "./ActivityTypeIcon";
import Link from "next/link";
import { StageChangeItem } from "./StageChangeItem";
import WhatsAppMessageLog from "@/components/whatsapp/WhatsAppMessageLog";

type Activity = {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  dueDate: Date | null;
  completed: boolean;
  createdAt: Date;
  gotoCallId?: string | null;
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

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function ActivityItem({
  activity,
  showLinks,
}: {
  activity: Activity;
  showLinks: boolean;
}) {
  const isGoto = Boolean(activity.gotoCallId);
  const isWhatsApp = activity.type === "whatsapp";

  return (
    <div className="relative flex items-start space-x-3">
      <div className="relative">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ring-8 ring-white ${
            isWhatsApp
              ? "bg-[#25D366]"
              : isGoto
                ? "bg-blue-500"
                : activity.completed
                  ? "bg-green-500"
                  : "bg-gray-100"
          }`}
        >
          {isWhatsApp ? (
            <WhatsAppIcon className="h-5 w-5 fill-white" />
          ) : isGoto ? (
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
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          ) : activity.completed ? (
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
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/activities/${activity.id}`}
              className="text-sm font-medium text-gray-900 hover:text-primary"
            >
              {activity.subject}
            </Link>
            {isWhatsApp && (
              <span className="rounded-full bg-[#25D366]/15 px-2 py-0.5 text-xs font-medium text-[#075E54]">
                WhatsApp
              </span>
            )}
            {isGoto && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                GoTo
              </span>
            )}
            {!isWhatsApp && !isGoto && activity.completed && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                Concluída
              </span>
            )}
            {!isWhatsApp && !isGoto && !activity.completed && (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                Agendada
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-gray-500">
            {formatDate(activity.createdAt)}
            {!isGoto && !isWhatsApp && activity.dueDate && (
              <span className="ml-2">
                • Vencimento: {formatDate(activity.dueDate)}
              </span>
            )}
          </p>
        </div>

        {/* Descrição: WhatsApp usa log formatado, demais usam texto simples */}
        {activity.description && (
          isWhatsApp ? (
            <div className="mt-2 rounded-xl border border-[#25D366]/20 bg-[#f0fdf4] p-3">
              <WhatsAppMessageLog description={activity.description} previewCount={3} />
            </div>
          ) : (
            <div className="mt-2 text-sm text-gray-700">
              <p>{activity.description}</p>
            </div>
          )
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
