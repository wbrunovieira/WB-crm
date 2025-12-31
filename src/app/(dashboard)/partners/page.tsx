import { getPartners } from "@/actions/partners";
import { getUsers } from "@/actions/users";
import { getSharedUsersForEntities } from "@/actions/entity-management";
import { SearchInput } from "@/components/shared/SearchInput";
import { OwnerFilter } from "@/components/shared/OwnerFilter";
import { EntityAccessBadges } from "@/components/shared/EntityAccessBadges";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: { search?: string; owner?: string };
}) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "admin";
  const currentUserId = session?.user?.id || "";

  const [partners, users] = await Promise.all([
    getPartners({ search: searchParams.search, owner: searchParams.owner }),
    isAdmin ? getUsers() : Promise.resolve([]),
  ]);

  // Get shared users for all partners (batch query)
  const partnerIds = partners.map((partner) => partner.id);
  const sharedUsersMap = await getSharedUsersForEntities("partner", partnerIds);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Parceiros</h1>
          <p className="mt-2 text-gray-600">
            Gerencie sua rede de parceiros e networking
          </p>
        </div>
        <Link
          href="/partners/new"
          className="rounded-md bg-primary px-4 py-2 text-white hover:bg-purple-700"
        >
          Novo Parceiro
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="w-full max-w-md">
          <SearchInput
            placeholder="Buscar parceiros..."
            defaultValue={searchParams.search}
          />
        </div>
        {isAdmin && users.length > 0 && (
          <OwnerFilter users={users} currentUserId={currentUserId} />
        )}
      </div>

      {partners.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">
            Nenhum parceiro encontrado
          </h3>
          <p className="mt-2 text-gray-500">
            Comece adicionando seu primeiro parceiro de networking.
          </p>
          <Link
            href="/partners/new"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-white hover:bg-purple-700"
          >
            Adicionar Parceiro
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {partners.map((partner) => (
            <Link
              key={partner.id}
              href={`/partners/${partner.id}`}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {partner.name}
                  </h3>
                  {isAdmin && partner.owner && (
                    <EntityAccessBadges
                      owner={{ id: partner.owner.id, name: partner.owner.name }}
                      sharedWith={sharedUsersMap[partner.id] || []}
                      currentUserId={currentUserId}
                      compact
                    />
                  )}
                </div>
                {partner.city && partner.state && (
                  <p className="text-sm text-gray-600">{partner.city}, {partner.state}</p>
                )}
                {partner.industry && (
                  <p className="text-xs text-gray-500">{partner.industry}</p>
                )}
              </div>

              <div className="mb-4">
                <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                  {partner.partnerType}
                </span>
              </div>

              {partner.expertise && (
                <p className="mb-4 text-sm text-gray-600 line-clamp-2">
                  <strong>Expertise:</strong> {partner.expertise}
                </p>
              )}

              <div className="flex items-center justify-between border-t border-gray-200 pt-4 text-xs text-gray-500">
                <div className="flex gap-4">
                  <span title="Contatos">
                    👥 {partner._count.contacts || 0}
                  </span>
                  <span title="Atividades">
                    📋 {partner._count.activities}
                  </span>
                  <span title="Leads Indicados">
                    🎯 {partner._count.referredLeads}
                  </span>
                </div>
                {partner.lastContactDate && (
                  <span title="Último contato">
                    {formatDistanceToNow(new Date(partner.lastContactDate), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                )}
              </div>

              {partner.website && (
                <div className="mt-2 text-xs text-primary hover:underline">
                  <a href={partner.website} target="_blank" rel="noopener noreferrer">
                    {partner.website}
                  </a>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
