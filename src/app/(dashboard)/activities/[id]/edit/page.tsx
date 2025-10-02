import { getActivityById } from "@/actions/activities";
import ActivityForm from "@/components/activities/ActivityForm";
import { getContactsList } from "@/lib/lists/contacts-list";
import { getDealsList } from "@/lib/lists/deals-list";
import { getLeadsList } from "@/lib/lists/leads-list";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function EditActivityPage({
  params,
}: {
  params: { id: string };
}) {
  const [activity, contacts, deals, leads] = await Promise.all([
    getActivityById(params.id),
    getContactsList(),
    getDealsList(),
    getLeadsList(),
  ]);

  if (!activity) {
    notFound();
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Link
            href={`/activities/${activity.id}`}
            className="text-gray-500 hover:text-gray-700"
          >
            ← Voltar
          </Link>
        </div>
        <h1 className="mt-4 text-3xl font-bold">Editar Atividade</h1>
      </div>

      <div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow">
        <ActivityForm activity={activity} contacts={contacts} deals={deals} leads={leads} />
      </div>
    </div>
  );
}
