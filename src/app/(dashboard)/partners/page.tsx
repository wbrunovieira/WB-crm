import { backendFetch } from "@/lib/backend/client";
import type { UserListItem } from "@/hooks/users/use-users";
import { SearchInput } from "@/components/shared/SearchInput";
import { OwnerFilter } from "@/components/shared/OwnerFilter";
import { EntityAccessBadges } from "@/components/shared/EntityAccessBadges";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PartnerStatusBadge } from "@/components/partners/PartnerStatusBadge";
import { PARTNER_STATUSES, PARTNER_STATUS_LABELS } from "@/lib/validations/partner";

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: { search?: string; owner?: string; status?: string };
}) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "admin";
  const currentUserId = session?.user?.id || "";

  const params = new URLSearchParams();
  if (searchParams.search) params.set("search", searchParams.search);
  if (searchParams.owner) params.set("owner", searchParams.owner);
  if (searchParams.status) params.set("status", searchParams.status);
  const qs = params.toString();

  // Build a status-filter href that preserves the other active filters.
  const statusHref = (status?: string) => {
    const p = new URLSearchParams();
    if (searchParams.search) p.set("search", searchParams.search);
    if (searchParams.owner) p.set("owner", searchParams.owner);
    if (status) p.set("status", status);
    const s = p.toString();
    return `/partners${s ? `?${s}` : ""}`;
  };
  const activeStatus = searchParams.status ?? "";

  type PartnerSummary = {
    id: string; ownerId: string; name: string; partnerType: string;
    partnerStatus: string;
    email?: string | null; phone?: string | null; city?: string | null;
    state?: string | null; country?: string | null; industry?: string | null;
    expertise?: string | null; companySize?: string | null;
    starRating?: number | null;
    lastContactDate?: string | null; website?: string | null;
    owner?: { id: string; name: string; email: string } | null;
    _count: { contacts: number; activities: number; referredLeads: number };
  };

  const [partners, users] = await Promise.all([
    backendFetch<PartnerSummary[]>(`/partners${qs ? `?${qs}` : ""}`).catch(() => []),
    backendFetch<UserListItem[]>('/users').catch(() => [] as UserListItem[]),
  ]);

  const partnerIds = partners.map((partner) => partner.id);
  const sharedUsersMap: Record<string, { id: string; name: string }[]> = partnerIds.length > 0
    ? await backendFetch<Record<string, { id: string; name: string }[]>>(
        `/shared-entities/batch?entityType=partner&entityIds=${partnerIds.join(",")}`
      ).catch(() => ({} as Record<string, { id: string; name: string }[]>))
    : {};

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

      {/* Lifecycle stage filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href={statusHref()}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
            activeStatus === ""
              ? "border-primary bg-primary text-white"
              : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          Todos
        </Link>
        {PARTNER_STATUSES.map((status) => (
          <Link
            key={status}
            href={statusHref(status)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              activeStatus === status
                ? "border-primary bg-primary text-white"
                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {PARTNER_STATUS_LABELS[status]}
          </Link>
        ))}
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

              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                  {partner.partnerType}
                </span>
                <PartnerStatusBadge status={partner.partnerStatus} />
                {partner.starRating != null && partner.starRating > 0 && (
                  <span className="inline-flex items-center gap-0.5" title={`${partner.starRating} estrela${partner.starRating > 1 ? "s" : ""}`}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3.5 w-3.5 ${star <= partner.starRating! ? "fill-amber-400 text-amber-400" : "fill-transparent text-gray-300"}`}
                      />
                    ))}
                  </span>
                )}
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
