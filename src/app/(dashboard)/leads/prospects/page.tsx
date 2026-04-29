import { backendFetch } from "@/lib/backend/client";
import type { UserListItem } from "@/hooks/users/use-users";
import { ProspectsTable } from "@/components/leads/ProspectsTable";
import { ProspectsSearchInput } from "@/components/leads/ProspectsSearchInput";
import { GoogleLeadsButton } from "@/components/leads/GoogleLeadsButton";
import { OwnerFilter } from "@/components/shared/OwnerFilter";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: {
    search?: string;
    owner?: string;
    showDiscarded?: string;
  };
}) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "admin";
  const currentUserId = session?.user?.id || "";
  const showDiscarded = searchParams.showDiscarded === "1";

  const prospectsQs = new URLSearchParams({ isProspect: "true" });
  if (!showDiscarded) prospectsQs.set("isArchived", "false");
  if (searchParams.search) prospectsQs.set("search", searchParams.search);
  if (searchParams.owner) prospectsQs.set("owner", searchParams.owner);

  type LeadSummary = { id: string; ownerId: string; businessName: string; status: string; quality: string | null; isArchived: boolean; phone: string | null; whatsapp: string | null; email: string | null; city: string | null; state: string | null; starRating: number | null; fieldsFilled: number | null; createdAt: string; updatedAt: string; owner: { id: string; name: string; email: string } | null; labels: Array<{ id: string; name: string; color: string }>; };
  const [prospectsResult, users] = await Promise.all([
    backendFetch<{ leads: LeadSummary[]; total: number }>(`/leads?${prospectsQs}`).catch(() => ({ leads: [], total: 0 })),
    backendFetch<UserListItem[]>('/users').catch(() => [] as UserListItem[]),
  ]);
  const prospects = prospectsResult.leads;

  // Build toggle URL preserving other params
  const toggleQs = new URLSearchParams();
  if (searchParams.search) toggleQs.set("search", searchParams.search);
  if (searchParams.owner) toggleQs.set("owner", searchParams.owner);
  if (!showDiscarded) toggleQs.set("showDiscarded", "1");
  const toggleHref = `/leads/prospects?${toggleQs}`;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Prospectos Google</h1>
          <p className="mt-2 text-gray-600">
            Empresas importadas do Google para análise. Qualifique as que deseja prospectar.
          </p>
        </div>
        <GoogleLeadsButton />
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <ProspectsSearchInput defaultValue={searchParams.search} />
          <Link
            href={toggleHref}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              showDiscarded
                ? "border-red-400 bg-red-50 text-red-700 hover:bg-red-100"
                : "border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-800"
            }`}
          >
            {showDiscarded ? "Ocultando descartados ✕" : "Mostrar descartados"}
          </Link>
        </div>
        {isAdmin && users.length > 0 && (
          <OwnerFilter users={users} currentUserId={currentUserId} />
        )}
      </div>

      {/* Contador */}
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex items-center rounded-lg bg-purple-100 px-3 py-1.5 text-sm font-semibold text-purple-800">
          {prospects.length} {prospects.length === 1 ? "prospecto" : "prospectos"}
        </span>
        {showDiscarded && (
          <span className="text-xs text-red-500 italic">incluindo descartados</span>
        )}
        {searchParams.search && (
          <span className="text-sm text-gray-500">com os filtros aplicados</span>
        )}
      </div>

      <ProspectsTable prospects={prospects} currentUserId={currentUserId} />
    </div>
  );
}
