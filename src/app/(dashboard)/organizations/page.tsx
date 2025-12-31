import { getOrganizations } from "@/actions/organizations";
import { getUsers } from "@/actions/users";
import { DeleteOrganizationButton } from "@/components/organizations/DeleteOrganizationButton";
import { SearchInput } from "@/components/shared/SearchInput";
import { OwnerFilter } from "@/components/shared/OwnerFilter";
import { OwnerBadge } from "@/components/shared/OwnerBadge";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: { search?: string; owner?: string };
}) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "admin";
  const currentUserId = session?.user?.id || "";

  const [organizations, users] = await Promise.all([
    getOrganizations({ search: searchParams.search, owner: searchParams.owner }),
    isAdmin ? getUsers() : Promise.resolve([]),
  ]);

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
          className="rounded-md bg-primary px-4 py-2 text-white hover:bg-purple-700"
        >
          Nova Organização
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="w-full max-w-md">
          <SearchInput
            placeholder="Buscar organizações..."
            defaultValue={searchParams.search}
          />
        </div>
        {isAdmin && users.length > 0 && (
          <OwnerFilter users={users} currentUserId={currentUserId} />
        )}
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
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-white hover:bg-purple-700"
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
                  Website
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Setor
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
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <Link
                        href={`/organizations/${org.id}`}
                        className="font-medium text-gray-700 hover:text-primary text-base"
                      >
                        {org.name}
                      </Link>
                      {isAdmin && org.owner && (
                        <OwnerBadge
                          ownerName={org.owner.name}
                          isCurrentUser={org.owner.id === currentUserId}
                        />
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {org.website || "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {org.industry || "-"}
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
                  <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/organizations/${org.id}/edit`}
                        className="text-gray-600 hover:text-primary"
                        title="Editar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </Link>
                      <DeleteOrganizationButton organizationId={org.id} />
                    </div>
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
