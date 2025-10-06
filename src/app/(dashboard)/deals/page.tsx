import { getDeals } from "@/actions/deals";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { getStagesList } from "@/lib/lists/stages-list";
import { DealStageSelect } from "@/components/deals/DealStageSelect";
import { DealStatusSelect } from "@/components/deals/DealStatusSelect";

export default async function DealsPage() {
  const [deals, stages] = await Promise.all([getDeals(), getStagesList()]);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Negócios</h1>
          <p className="mt-2 text-gray-600">
            Gerencie seus negócios e oportunidades
          </p>
        </div>
        <Link
          href="/deals/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
        >
          Novo Negócio
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Título
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Valor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Contato
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Organização
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Estágio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {deals.map((deal) => (
              <tr key={deal.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4">
                  <Link
                    href={`/deals/${deal.id}`}
                    className="text-sm font-medium text-gray-900 hover:text-primary hover:underline"
                  >
                    {deal.title}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {formatCurrency(deal.value, deal.currency)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {deal.contact ? (
                    <Link
                      href={`/contacts/${deal.contact.id}`}
                      className="hover:underline hover:text-primary"
                    >
                      {deal.contact.name}
                    </Link>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {deal.organization ? (
                    <Link
                      href={`/organizations/${deal.organization.id}`}
                      className="hover:underline hover:text-primary"
                    >
                      {deal.organization.name}
                    </Link>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <DealStageSelect
                    dealId={deal.id}
                    currentStageId={deal.stage.id}
                    stages={stages}
                  />
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <DealStatusSelect
                    dealId={deal.id}
                    currentStatus={deal.status}
                    dealData={{
                      title: deal.title,
                      value: deal.value,
                      currency: deal.currency,
                      stageId: deal.stage.id,
                      contactId: deal.contact?.id || null,
                      organizationId: deal.organization?.id || null,
                      expectedCloseDate: deal.expectedCloseDate,
                    }}
                  />
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  <Link
                    href={`/deals/${deal.id}/edit`}
                    className="text-primary hover:underline"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deals.length === 0 && (
        <div className="mt-8 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">
            Nenhum negócio encontrado
          </h3>
          <p className="mt-2 text-gray-500">
            Comece criando seu primeiro negócio.
          </p>
          <Link
            href="/deals/new"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Novo Negócio
          </Link>
        </div>
      )}
    </div>
  );
}
