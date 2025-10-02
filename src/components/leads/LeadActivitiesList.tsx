import Link from "next/link";
import { formatDate } from "@/lib/utils";

type Activity = {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  dueDate: Date | null;
  completed: boolean;
};

export function LeadActivitiesList({
  leadId,
  activities,
}: {
  leadId: string;
  activities: Activity[];
}) {
  const typeLabels: Record<string, string> = {
    call: "Ligação",
    meeting: "Reunião",
    email: "E-mail",
    task: "Tarefa",
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Atividades ({activities.length})
        </h2>
        <Link
          href={`/activities/new?leadId=${leadId}`}
          className="text-sm text-primary hover:text-purple-700"
        >
          + Adicionar Atividade
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">
            Nenhuma atividade registrada ainda.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Adicione atividades para acompanhar o progresso deste lead.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <Link
              key={activity.id}
              href={`/activities/${activity.id}`}
              className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-primary hover:bg-purple-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {typeLabels[activity.type]}
                    </span>
                    {activity.completed && (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Concluída
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 font-medium text-gray-900">
                    {activity.subject}
                  </h3>
                  {activity.description && (
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                      {activity.description}
                    </p>
                  )}
                  {activity.dueDate && (
                    <p className="mt-2 text-xs text-gray-500">
                      Vencimento: {formatDate(activity.dueDate)}
                    </p>
                  )}
                </div>
                <svg
                  className="h-5 w-5 text-gray-400"
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
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
