import { getDealById } from "@/actions/deals";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import DeleteDealButton from "@/components/deals/DeleteDealButton";

export default async function DealDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const deal = await getDealById(params.id);

  if (!deal) {
    notFound();
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Link href="/deals" className="text-gray-500 hover:text-gray-700">
            ← Voltar
          </Link>
        </div>
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{deal.title}</h1>
            <p className="mt-2 text-2xl font-semibold text-primary">
              {formatCurrency(deal.value, deal.currency)}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/deals/${deal.id}/edit`}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Editar
            </Link>
            <DeleteDealButton dealId={deal.id} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Informações Básicas</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    deal.status === "won"
                      ? "bg-green-100 text-green-800"
                      : deal.status === "lost"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {deal.status === "won"
                    ? "Ganho"
                    : deal.status === "lost"
                      ? "Perdido"
                      : "Aberto"}
                </span>
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Estágio</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-primary">
                  {deal.stage.pipeline.name} - {deal.stage.name}
                </span>
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">
                Data Prevista de Fechamento
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(deal.expectedCloseDate)}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">
                Data de Criação
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(deal.createdAt)}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Responsável</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {deal.owner.name || deal.owner.email}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Contato & Organização</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Contato</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {deal.contact ? (
                  <Link
                    href={`/contacts/${deal.contact.id}`}
                    className="text-primary hover:underline"
                  >
                    {deal.contact.name}
                  </Link>
                ) : (
                  "Nenhum contato vinculado"
                )}
              </dd>
            </div>

            {deal.contact?.email && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a
                    href={`mailto:${deal.contact.email}`}
                    className="text-primary hover:underline"
                  >
                    {deal.contact.email}
                  </a>
                </dd>
              </div>
            )}

            {deal.contact?.phone && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Telefone</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {deal.contact.phone}
                </dd>
              </div>
            )}

            <div>
              <dt className="text-sm font-medium text-gray-500">Organização</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {deal.organization ? (
                  <Link
                    href={`/organizations/${deal.organization.id}`}
                    className="text-primary hover:underline"
                  >
                    {deal.organization.name}
                  </Link>
                ) : (
                  "Nenhuma organização vinculada"
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-6 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">
          Atividades ({deal.activities.length})
        </h2>
        {deal.activities.length > 0 ? (
          <div className="space-y-3">
            {deal.activities.map((activity) => (
              <div
                key={activity.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {activity.subject}
                    </h3>
                    {activity.description && (
                      <p className="mt-1 text-sm text-gray-600">
                        {activity.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      activity.completed
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {activity.completed ? "Concluída" : "Pendente"}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  <span className="capitalize">{activity.type}</span>
                  {activity.dueDate && (
                    <span>Vencimento: {formatDate(activity.dueDate)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">
            Nenhuma atividade registrada
          </p>
        )}
      </div>
    </div>
  );
}
