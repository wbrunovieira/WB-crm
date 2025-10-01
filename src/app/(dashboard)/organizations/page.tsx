import { getOrganizations } from "@/actions/organizations";
import Link from "next/link";

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: { search?: string };
}) {
  const organizations = await getOrganizations(searchParams.search);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organizações</h1>
          <p className="mt-2 text-gray-600">
            Gerencie empresas e organizações
          </p>
        </div>
        <Link
          href="/organizations/new"
          className="rounded-md bg-primary px-4 py-2 text-white hover:bg-blue-700"
        >
          Nova Organização
        </Link>
      </div>

      <div className="mb-6">
        <form>
          <input
            type="text"
            name="search"
            placeholder="Buscar organizações..."
            defaultValue={searchParams.search}
            className="w-full max-w-md rounded-md border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </form>
      </div>

      {organizations.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">
            Nenhuma organização encontrada
          </h3>
          <p className="mt-2 text-gray-500">
            Comece criando sua primeira organização.
          </p>
          <Link
            href="/organizations/new"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-white hover:bg-blue-700"
          >
            Criar Organização
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Domínio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Telefone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Contatos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Negócios
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <Link
                      href={`/organizations/${org.id}`}
                      className="font-medium text-primary hover:text-blue-700"
                    >
                      {org.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {org.domain || "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {org.phone || "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {org._count.contacts}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {org._count.deals}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <Link
                      href={`/organizations/${org.id}/edit`}
                      className="text-primary hover:text-blue-700"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
