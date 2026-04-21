import { backendFetch } from "@/lib/backend/client";
import type { UserListItem } from "@/hooks/users/use-users";
import type { ICP as ICPType } from "@/hooks/icps/use-icps";
import { getSharedUsersForEntities } from "@/actions/entity-management";
import { LeadsFilters } from "@/components/leads/LeadsFilters";
import { OwnerFilter } from "@/components/shared/OwnerFilter";
import { AgentLeadGenerationButton } from "@/components/leads/AgentLeadGenerationButton";
import { LeadResearchNotifications } from "@/components/leads/LeadResearchNotifications";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { Pagination } from "@/components/shared/Pagination";
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
    page?: string;
  };
}) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "admin";
  const currentUserId = session?.user?.id || "";

  type LeadSummary = {
    id: string; ownerId: string; businessName: string; status: string;
    quality: string | null; isArchived: boolean; isProspect: boolean;
    email: string | null; phone: string | null; whatsapp: string | null;
    city: string | null; state: string | null; country: string | null;
    starRating: number | null; fieldsFilled: number | null;
    convertedToOrganizationId: string | null; convertedAt: string | null;
    referredByPartnerId: string | null; driveFolderId: string | null;
    inOperationsAt: string | null; createdAt: string; updatedAt: string;
    owner: { id: string; name: string; email: string } | null;
    referredByPartner: { id: string; name: string } | null;
    labels: Array<{ id: string; name: string; color: string }>;
    primaryCNAE: { id: string; code: string; description: string } | null;
  };
  type LeadsResult = { leads: LeadSummary[]; total: number; page: number; pageSize: number };

  const leadsQs = new URLSearchParams();
  if (searchParams.search) leadsQs.set("search", searchParams.search);
  if (searchParams.contactSearch) leadsQs.set("contactSearch", searchParams.contactSearch);
  if (searchParams.status) leadsQs.set("status", searchParams.status);
  if (searchParams.quality) leadsQs.set("quality", searchParams.quality);
  if (searchParams.owner) leadsQs.set("owner", searchParams.owner);
  if (searchParams.icpId) leadsQs.set("icpId", searchParams.icpId);
  if (searchParams.hasCadence) leadsQs.set("hasCadence", searchParams.hasCadence);
  if (searchParams.page) leadsQs.set("page", searchParams.page);
  // Map archived → isArchived
  if (searchParams.archived === "yes") leadsQs.set("isArchived", "true");
  else if (searchParams.archived === "all") { /* no filter */ }
  else leadsQs.set("isArchived", "false");
  leadsQs.set("isProspect", "false");

  const [leadsResult, users, icps] = await Promise.all([
    backendFetch<LeadsResult>(`/leads?${leadsQs}`).catch(() => ({ leads: [], total: 0, page: 1, pageSize: 50 })),
    backendFetch<UserListItem[]>('/users'),
    backendFetch<ICPType[]>('/icps?status=active').catch(() => [] as ICPType[]),
  ]);

  const { leads, total, page, pageSize } = leadsResult;

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

      {/* Lead Counter + Selection Tip */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-lg bg-purple-100 px-3 py-1.5 text-sm font-semibold text-purple-800">
            {total} {total === 1 ? "lead" : "leads"}
          </span>
          {(searchParams.search || searchParams.contactSearch || searchParams.status || searchParams.quality || searchParams.icpId || searchParams.owner || searchParams.hasCadence || searchParams.archived) && (
            <span className="text-sm text-gray-500">com os filtros aplicados</span>
          )}
        </div>
        <p className="text-xs text-gray-400">
          Clique na linha para selecionar · <kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] text-gray-500">Shift</kbd> + clique para selecionar um intervalo
        </p>
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
        <>
          <LeadsTable
            leads={leads}
            sharedUsersMap={sharedUsersMap}
            currentUserId={currentUserId}
            contactSearch={searchParams.contactSearch}
          />
          <Pagination total={total} page={page} pageSize={pageSize} />
        </>
      )}
    </div>
  );
}
