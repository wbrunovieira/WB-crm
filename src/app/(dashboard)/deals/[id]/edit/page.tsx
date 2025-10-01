import { getDealById } from "@/actions/deals";
import DealForm from "@/components/deals/DealForm";
import { getContactsList } from "@/lib/lists/contacts-list";
import { getOrganizationsList } from "@/actions/organizations-list";
import { getStagesList } from "@/lib/lists/stages-list";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function EditDealPage({
  params,
}: {
  params: { id: string };
}) {
  const [deal, contacts, organizations, stages] = await Promise.all([
    getDealById(params.id),
    getContactsList(),
    getOrganizationsList(),
    getStagesList(),
  ]);

  if (!deal) {
    notFound();
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Link
            href={`/deals/${deal.id}`}
            className="text-gray-500 hover:text-gray-700"
          >
            ← Voltar
          </Link>
        </div>
        <h1 className="mt-4 text-3xl font-bold">Editar Negócio</h1>
      </div>

      <div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow">
        <DealForm
          deal={deal}
          contacts={contacts}
          organizations={organizations}
          stages={stages}
        />
      </div>
    </div>
  );
}
