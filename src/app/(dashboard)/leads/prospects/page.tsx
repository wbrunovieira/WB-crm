import { getProspects } from "@/actions/leads";
import { backendFetch } from "@/lib/backend/client";
import type { UserListItem } from "@/hooks/users/use-users";
import { ProspectsTable } from "@/components/leads/ProspectsTable";
import { ProspectsSearchInput } from "@/components/leads/ProspectsSearchInput";
import { GoogleLeadsButton } from "@/components/leads/GoogleLeadsButton";
import { OwnerFilter } from "@/components/shared/OwnerFilter";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: {
    search?: string;
    owner?: string;
  };
}) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "admin";
  const currentUserId = session?.user?.id || "";

  const [prospects, users] = await Promise.all([
    getProspects(searchParams),
    backendFetch<UserListItem[]>('/users'),
  ]);

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
        <ProspectsSearchInput defaultValue={searchParams.search} />
        {isAdmin && users.length > 0 && (
          <OwnerFilter users={users} currentUserId={currentUserId} />
        )}
      </div>

      {/* Contador */}
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex items-center rounded-lg bg-purple-100 px-3 py-1.5 text-sm font-semibold text-purple-800">
          {prospects.length} {prospects.length === 1 ? "prospecto" : "prospectos"}
        </span>
        {searchParams.search && (
          <span className="text-sm text-gray-500">com os filtros aplicados</span>
        )}
      </div>

      <ProspectsTable prospects={prospects} currentUserId={currentUserId} />
    </div>
  );
}
