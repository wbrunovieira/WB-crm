import { getLeads } from "@/actions/leads";
import { getUsers } from "@/actions/users";
import { DeleteLeadIconButton } from "@/components/leads/DeleteLeadIconButton";
import { LeadsFilters } from "@/components/leads/LeadsFilters";
import { LeadNameCell } from "@/components/leads/LeadNameCell";
import { OwnerFilter } from "@/components/shared/OwnerFilter";
import { OwnerBadge } from "@/components/shared/OwnerBadge";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: {
    search?: string;
    status?: string;
    quality?: string;
    owner?: string;
  };
}) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "admin";
  const currentUserId = session?.user?.id || "";

  const [leads, users] = await Promise.all([
    getLeads(searchParams),
    isAdmin ? getUsers() : Promise.resolve([]),
  ]);

  const statusLabels: Record<string, string> = {
    new: "Novo",
    contacted: "Contatado",
    qualified: "Qualificado",
    disqualified: "Desqualificado",
  };

  const qualityLabels: Record<string, string> = {
    cold: "Frio",
    warm: "Morno",
    hot: "Quente",
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="mt-2 text-gray-600">
            Gerencie seus leads e converta em clientes
          </p>
        </div>
        <Link
          href="/leads/new"
          className="rounded-md bg-primary px-4 py-2 text-white hover:bg-purple-700"
        >
          Novo Lead
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <LeadsFilters />
        {isAdmin && users.length > 0 && (
          <OwnerFilter users={users} currentUserId={currentUserId} />
        )}
      </div>

      {leads.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">
            Nenhum lead encontrado
          </h3>
          <p className="mt-2 text-gray-500">
            Comece criando seu primeiro lead.
          </p>
          <Link
            href="/leads/new"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-white hover:bg-purple-700"
          >
            Criar Lead
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Empresa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Localização
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Contatos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Qualidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <LeadNameCell
                        id={lead.id}
                        businessName={lead.businessName}
                        registeredName={lead.registeredName}
                      />
                      {isAdmin && lead.owner && (
                        <OwnerBadge
                          ownerName={lead.owner.name}
                          isCurrentUser={lead.owner.id === currentUserId}
                        />
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {lead.city && lead.state
                      ? `${lead.city}, ${lead.state}`
                      : lead.city || lead.state || "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {lead._count.leadContacts} contato(s)
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {lead.quality && (
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          lead.quality === "hot"
                            ? "bg-red-100 text-red-800"
                            : lead.quality === "warm"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {qualityLabels[lead.quality]}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        lead.status === "qualified"
                          ? "bg-green-100 text-green-800"
                          : lead.status === "contacted"
                            ? "bg-blue-100 text-blue-800"
                            : lead.status === "disqualified"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {statusLabels[lead.status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-gray-600 hover:text-primary"
                        title="Ver detalhes"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path
                            fillRule="evenodd"
                            d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </Link>
                      <Link
                        href={`/leads/${lead.id}/edit`}
                        className="text-gray-600 hover:text-primary"
                        title="Editar"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </Link>
                      <DeleteLeadIconButton leadId={lead.id} />
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
