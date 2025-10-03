import { getActivities } from "@/actions/activities";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import ActivityTypeIcon from "@/components/activities/ActivityTypeIcon";
import ToggleCompletedButton from "@/components/activities/ToggleCompletedButton";

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: { type?: string; completed?: string };
}) {
  const filters = {
    ...(searchParams.type && { type: searchParams.type }),
    ...(searchParams.completed && {
      completed: searchParams.completed === "true",
    }),
  };

  const activities = await getActivities(filters);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Atividades</h1>
          <p className="mt-2 text-gray-600">
            Gerencie suas tarefas e compromissos
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/activities/calendar"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            📅 Calendário
          </Link>
          <Link
            href="/activities/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Nova Atividade
          </Link>
        </div>
      </div>

      <div className="mb-6 flex gap-4">
        <Link
          href="/activities"
          className={`rounded-md px-4 py-2 text-sm font-medium ${
            !searchParams.type && !searchParams.completed
              ? "bg-primary text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          Todas
        </Link>
        <Link
          href="/activities?completed=false"
          className={`rounded-md px-4 py-2 text-sm font-medium ${
            searchParams.completed === "false"
              ? "bg-primary text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          Pendentes
        </Link>
        <Link
          href="/activities?completed=true"
          className={`rounded-md px-4 py-2 text-sm font-medium ${
            searchParams.completed === "true"
              ? "bg-primary text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          Concluídas
        </Link>
        <div className="ml-4 flex flex-wrap gap-2">
          {[
            { type: "call", label: "Ligações", icon: "📞" },
            { type: "meeting", label: "Reuniões", icon: "📅" },
            { type: "email", label: "E-mails", icon: "✉️" },
            { type: "task", label: "Tarefas", icon: "📋" },
            { type: "whatsapp", label: "WhatsApp", icon: "💬" },
            { type: "visit", label: "Visitas", icon: "📍" },
            { type: "instagram", label: "Instagram", icon: "📷" },
          ].map(({ type, label, icon }) => (
            <Link
              key={type}
              href={`/activities?type=${type}`}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
                searchParams.type === type
                  ? "bg-primary text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="rounded-lg bg-white p-6 shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <ToggleCompletedButton
                  activityId={activity.id}
                  completed={activity.completed}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <ActivityTypeIcon type={activity.type} />
                    <Link
                      href={`/activities/${activity.id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-primary"
                    >
                      {activity.subject}
                    </Link>
                    {activity.completed && (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                        Concluída
                      </span>
                    )}
                  </div>

                  {activity.description && (
                    <p className="mt-2 text-sm text-gray-600">
                      {activity.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                    {activity.dueDate && (
                      <div className="flex items-center gap-1">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span>
                          Vencimento: {formatDate(activity.dueDate)}
                        </span>
                      </div>
                    )}

                    {activity.deal && (
                      <Link
                        href={`/deals/${activity.deal.id}`}
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>{activity.deal.title}</span>
                      </Link>
                    )}

                    {activity.contact && (
                      <Link
                        href={`/contacts/${activity.contact.id}`}
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        <span>{activity.contact.name}</span>
                      </Link>
                    )}

                    {activity.lead && (
                      <Link
                        href={`/leads/${activity.lead.id}`}
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                        <span>{activity.lead.businessName}</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              <Link
                href={`/activities/${activity.id}/edit`}
                className="text-sm text-primary hover:underline"
              >
                Editar
              </Link>
            </div>
          </div>
        ))}
      </div>

      {activities.length === 0 && (
        <div className="mt-8 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">
            Nenhuma atividade encontrada
          </h3>
          <p className="mt-2 text-gray-500">
            Comece criando sua primeira atividade.
          </p>
          <Link
            href="/activities/new"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Nova Atividade
          </Link>
        </div>
      )}
    </div>
  );
}
