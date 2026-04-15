import { getLeads } from "@/actions/leads";
import { getUsers } from "@/actions/users";
import { getICPs } from "@/actions/icps";
import { getSharedUsersForEntities } from "@/actions/entity-management";
import { LeadsFilters } from "@/components/leads/LeadsFilters";
import { OwnerFilter } from "@/components/shared/OwnerFilter";
import { AgentLeadGenerationButton } from "@/components/leads/AgentLeadGenerationButton";
import { LeadResearchNotifications } from "@/components/leads/LeadResearchNotifications";
import { GoogleLeadsButton } from "@/components/leads/GoogleLeadsButton";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: {
    search?: string;
    contactSearch?: string;
    status?: string;
    quality?: string;
    owner?: string;
    icpId?: string;
    hasCadence?: string;
    archived?: string;
  };
}) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "admin";
  const currentUserId = session?.user?.id || "";

  const [leads, users, icps] = await Promise.all([
    getLeads(searchParams),
    isAdmin ? getUsers() : Promise.resolve([]),
    getICPs({ status: "active" }),
  ]);

  // Get shared users for all leads (batch query)
  const leadIds = leads.map((lead) => lead.id);
  const sharedUsersMap = await getSharedUsersForEntities("lead", leadIds);

  return (
    <div className="p-8">
      {/* Notification polling for lead research results */}
      <LeadResearchNotifications />

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="mt-2 text-gray-600">
            Gerencie seus leads e converta em clientes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GoogleLeadsButton />
          <AgentLeadGenerationButton icps={icps} />
          <Link
            href="/leads/new"
            className="rounded-md bg-primary px-4 py-2 text-white hover:bg-purple-700"
          >
            Novo Lead
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <LeadsFilters icps={icps} />
        {isAdmin && users.length > 0 && (
          <OwnerFilter users={users} currentUserId={currentUserId} />
        )}
      </div>

      {/* Lead Counter */}
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex items-center rounded-lg bg-purple-100 px-3 py-1.5 text-sm font-semibold text-purple-800">
          {leads.length} {leads.length === 1 ? "lead" : "leads"}
        </span>
        {(searchParams.search || searchParams.contactSearch || searchParams.status || searchParams.quality || searchParams.icpId || searchParams.owner || searchParams.hasCadence || searchParams.archived) && (
          <span className="text-sm text-gray-500">com os filtros aplicados</span>
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
        <LeadsTable
          leads={leads}
          sharedUsersMap={sharedUsersMap}
          currentUserId={currentUserId}
          contactSearch={searchParams.contactSearch}
        />
      )}
    </div>
  );
}
