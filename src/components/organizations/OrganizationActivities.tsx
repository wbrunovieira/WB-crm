"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import PurgeActivityButton from "@/components/activities/PurgeActivityButton";
import ActivityTypeIcon from "@/components/activities/ActivityTypeIcon";

type Activity = {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  dueDate: Date | string | null;
  completed: boolean;
  createdAt: Date | string;
  deal: { title: string } | null;
  contact: { name: string } | null;
};

interface OrganizationActivitiesProps {
  activities: Activity[];
  organizationId: string;
}

const typeConfig: Record<string, { label: string; bg: string; text: string }> = {
  call: { label: "Ligação", bg: "bg-blue-100", text: "text-blue-800" },
  meeting: { label: "Reunião", bg: "bg-purple-100", text: "text-purple-800" },
  email: { label: "Email", bg: "bg-green-100", text: "text-green-800" },
  task: { label: "Tarefa", bg: "bg-orange-100", text: "text-orange-800" },
  whatsapp: { label: "WhatsApp", bg: "bg-green-100", text: "text-green-700" },
  physical_visit: { label: "Visita Presencial", bg: "bg-red-100", text: "text-red-800" },
  visit: { label: "Visita", bg: "bg-red-100", text: "text-red-800" },
  instagram_dm: { label: "DM Instagram", bg: "bg-pink-100", text: "text-pink-800" },
  instagram: { label: "Instagram", bg: "bg-pink-100", text: "text-pink-800" },
};

function calculateDaysSinceLastActivity(activities: Activity[]): number | null {
  if (activities.length === 0) return null;

  const lastActivity = activities[0];
  const now = new Date();
  const lastActivityDate = new Date(lastActivity.createdAt);
  const diffTime = Math.abs(now.getTime() - lastActivityDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

export function OrganizationActivities({
  activities,
  organizationId,
}: OrganizationActivitiesProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const router = useRouter();
  const daysSinceLastActivity = calculateDaysSinceLastActivity(activities);

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Atividades ({activities.length})
          </h2>
          {daysSinceLastActivity !== null && (
            <p
              className={`mt-1 text-sm ${
                daysSinceLastActivity > 30
                  ? "text-red-600 font-semibold"
                  : daysSinceLastActivity > 14
                    ? "text-orange-600"
                    : "text-gray-500"
              }`}
            >
              {daysSinceLastActivity === 0
                ? "Última atividade: hoje"
                : daysSinceLastActivity === 1
                  ? "Última atividade: há 1 dia"
                  : `Última atividade: há ${daysSinceLastActivity} dias`}
            </p>
          )}
          {daysSinceLastActivity === null && (
            <p className="mt-1 text-sm text-red-600 font-semibold">
              Nenhuma atividade registrada
            </p>
          )}
        </div>
        <Link
          href={`/activities/new?organizationId=${organizationId}`}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
        >
          + Nova Atividade
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-500 mb-3">
            Nenhuma atividade registrada para esta organização
          </p>
          <Link
            href={`/activities/new?organizationId=${organizationId}`}
            className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            Registrar Primeira Atividade
          </Link>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className={`rounded-lg border p-4 ${
                activity.completed
                  ? "bg-gray-50 border-gray-200"
                  : "bg-white border-gray-300"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${typeConfig[activity.type]?.bg ?? "bg-gray-100"} ${typeConfig[activity.type]?.text ?? "text-gray-800"}`}>
                      <ActivityTypeIcon type={activity.type} className="h-3.5 w-3.5" />
                      {typeConfig[activity.type]?.label ?? activity.type}
                    </span>
                    {activity.completed && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Concluída
                      </span>
                    )}
                  </div>
                  <h3
                    className={`mt-1 font-medium ${
                      activity.completed
                        ? "text-gray-500 line-through"
                        : "text-gray-900"
                    }`}
                  >
                    {activity.subject}
                  </h3>
                  {activity.description && (
                    <p className="mt-1 text-sm text-gray-600">
                      {activity.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    {activity.deal && (
                      <span>Negócio: {activity.deal.title}</span>
                    )}
                    {activity.contact && (
                      <span>Contato: {activity.contact.name}</span>
                    )}
                    <span>
                      {formatDistanceToNow(new Date(activity.createdAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </div>
                {isAdmin && (
                  <PurgeActivityButton activityId={activity.id} onPurged={() => router.refresh()} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
