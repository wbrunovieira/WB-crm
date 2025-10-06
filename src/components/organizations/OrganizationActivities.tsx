"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

type Activity = {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  dueDate: Date | null;
  completed: boolean;
  createdAt: Date;
  deal: { title: string } | null;
  contact: { name: string } | null;
};

interface OrganizationActivitiesProps {
  activities: Activity[];
  organizationId: string;
}

function getActivityIcon(type: string) {
  switch (type) {
    case "call":
      return "📞";
    case "meeting":
      return "👥";
    case "email":
      return "📧";
    case "task":
      return "✓";
    case "whatsapp":
      return "💬";
    case "physical_visit":
      return "🏢";
    case "instagram_dm":
      return "📸";
    default:
      return "📋";
  }
}

function getActivityTypeLabel(type: string) {
  const labels: Record<string, string> = {
    call: "Ligação",
    meeting: "Reunião",
    email: "Email",
    task: "Tarefa",
    whatsapp: "WhatsApp",
    physical_visit: "Visita Presencial",
    instagram_dm: "DM Instagram",
  };
  return labels[type] || type;
}

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
                    <span className="text-xl">{getActivityIcon(activity.type)}</span>
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {getActivityTypeLabel(activity.type)}
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
