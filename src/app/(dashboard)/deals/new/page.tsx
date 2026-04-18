import DealForm from "@/components/deals/DealForm";
import { getContactsList } from "@/lib/lists/contacts-list";
import { getOrganizationsList } from "@/actions/organizations-list";
import { getStagesList } from "@/lib/lists/stages-list";
import { getLeadsList } from "@/actions/leads-list";
import Link from "next/link";

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: { organizationId?: string };
}) {
  const [contacts, organizations, stages, leadsData] = await Promise.all([
    getContactsList(),
    getOrganizationsList(),
    getStagesList(),
    getLeadsList(),
  ]);

  const leads = leadsData.map((l) => ({ id: l.id, businessName: l.businessName }));

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Link href="/deals" className="text-gray-500 hover:text-gray-700">
            ← Voltar
          </Link>
        </div>
        <h1 className="mt-4 text-3xl font-bold">Novo Negócio</h1>
      </div>

      <div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow">
        <DealForm
          contacts={contacts}
          organizations={organizations}
          leads={leads}
          stages={stages}
          preselectedOrganizationId={searchParams.organizationId}
        />
      </div>
    </div>
  );
}
