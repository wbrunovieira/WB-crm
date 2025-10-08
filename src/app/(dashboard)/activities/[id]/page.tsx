import { getActivityById } from "@/actions/activities";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import ActivityTypeIcon from "@/components/activities/ActivityTypeIcon";
import DeleteActivityButton from "@/components/activities/DeleteActivityButton";

export default async function ActivityDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const activity = await getActivityById(params.id);

  if (!activity) {
    notFound();
  }

  const typeLabels = {
    call: "Ligação",
    meeting: "Reunião",
    email: "E-mail",
    task: "Tarefa",
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Link
            href="/activities"
            className="text-gray-500 hover:text-gray-700"
          >
            ← Voltar
          </Link>
        </div>
        <div className="mt-4 flex items-start justify-between">
          <div className="flex items-start gap-4">
            <ActivityTypeIcon type={activity.type} />
            <div>
              <h1 className="text-3xl font-bold">{activity.subject}</h1>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  {typeLabels[activity.type as keyof typeof typeLabels]}
                </span>
                {activity.completed ? (
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                    Concluída
                  </span>
                ) : (
                  <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                    Pendente
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/activities/${activity.id}/edit`}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Editar
            </Link>
            <DeleteActivityButton activityId={activity.id} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Detalhes</h2>
          <dl className="space-y-3">
            {activity.description && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Descrição</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {activity.description}
                </dd>
              </div>
            )}

            {activity.dueDate && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Data de Vencimento
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(activity.dueDate)}
                </dd>
              </div>
            )}

            <div>
              <dt className="text-sm font-medium text-gray-500">
                Data de Criação
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(activity.createdAt)}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Responsável</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {activity.owner.name || activity.owner.email}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Vínculos</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Negócio</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {activity.deal ? (
                  <Link
                    href={`/deals/${activity.deal.id}`}
                    className="text-primary hover:underline"
                  >
                    {activity.deal.title}
                  </Link>
                ) : (
                  "Nenhum negócio vinculado"
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">
                {activity.contacts && activity.contacts.length > 1 ? "Contatos" : "Contato"}
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {activity.contacts && activity.contacts.length > 0 ? (
                  <div className="space-y-3">
                    {activity.contacts.map((contact: any) => (
                      <div key={contact.id} className="border-b border-gray-100 pb-2 last:border-b-0 last:pb-0">
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {contact.name}
                        </Link>
                        {contact.email && (
                          <p className="mt-1 text-sm text-gray-500">
                            {contact.email}
                          </p>
                        )}
                        {contact.phone && (
                          <p className="text-sm text-gray-500">
                            {contact.phone}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : activity.contact ? (
                  <div>
                    <Link
                      href={`/contacts/${activity.contact.id}`}
                      className="text-primary hover:underline"
                    >
                      {activity.contact.name}
                    </Link>
                    {activity.contact.email && (
                      <p className="mt-1 text-sm text-gray-500">
                        {activity.contact.email}
                      </p>
                    )}
                    {activity.contact.phone && (
                      <p className="text-sm text-gray-500">
                        {activity.contact.phone}
                      </p>
                    )}
                  </div>
                ) : (
                  "Nenhum contato vinculado"
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
