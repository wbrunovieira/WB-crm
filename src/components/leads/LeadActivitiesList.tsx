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
  const typeConfig: Record<string, { label: string; bg: string; text: string; hoverBg: string; hoverText: string }> = {
    call: { label: "Ligação", bg: "bg-blue-100", text: "text-blue-800", hoverBg: "group-hover:bg-blue-200", hoverText: "group-hover:text-blue-900" },
    meeting: { label: "Reunião", bg: "bg-pink-100", text: "text-pink-800", hoverBg: "group-hover:bg-pink-200", hoverText: "group-hover:text-pink-900" },
    email: { label: "E-mail", bg: "bg-purple-100", text: "text-purple-800", hoverBg: "group-hover:bg-purple-200", hoverText: "group-hover:text-purple-900" },
    task: { label: "Tarefa", bg: "bg-amber-100", text: "text-amber-800", hoverBg: "group-hover:bg-amber-200", hoverText: "group-hover:text-amber-900" },
    whatsapp: { label: "WhatsApp", bg: "bg-green-100", text: "text-green-800", hoverBg: "group-hover:bg-green-200", hoverText: "group-hover:text-green-900" },
    linkedin: { label: "LinkedIn", bg: "bg-sky-100", text: "text-sky-800", hoverBg: "group-hover:bg-sky-200", hoverText: "group-hover:text-sky-900" },
    instagram: { label: "Instagram", bg: "bg-rose-100", text: "text-rose-800", hoverBg: "group-hover:bg-rose-200", hoverText: "group-hover:text-rose-900" },
    physical_visit: { label: "Visita", bg: "bg-teal-100", text: "text-teal-800", hoverBg: "group-hover:bg-teal-200", hoverText: "group-hover:text-teal-900" },
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <div className="mb-5 flex items-center justify-between pb-3 border-b-2 border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">📅</span>
          Atividades ({activities.length})
        </h2>
        <Link
          href={`/activities/new?leadId=${leadId}`}
          className="inline-flex items-center gap-2 rounded-lg bg-[#792990] px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        >
          <span className="text-lg text-white">+</span>
          Adicionar Atividade
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
              className="group block rounded-lg border border-gray-200 p-4 transition-all duration-200 hover:border-purple-300 hover:bg-purple-50/60 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${typeConfig[activity.type]?.bg ?? "bg-gray-100"} ${typeConfig[activity.type]?.text ?? "text-gray-800"} ${typeConfig[activity.type]?.hoverBg ?? ""} ${typeConfig[activity.type]?.hoverText ?? ""}`}>
                      {typeConfig[activity.type]?.label ?? activity.type}
                    </span>
                    {activity.completed && (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Concluída
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 font-medium text-gray-900 group-hover:text-purple-900">
                    {activity.subject}
                  </h3>
                  {activity.description && (
                    <p className="mt-1 text-sm text-gray-600 group-hover:text-gray-700 line-clamp-2">
                      {activity.description}
                    </p>
                  )}
                  {activity.dueDate && (
                    <p className="mt-2 text-xs text-gray-500 group-hover:text-gray-600">
                      Vencimento: {formatDate(activity.dueDate)}
                    </p>
                  )}
                </div>
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
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
