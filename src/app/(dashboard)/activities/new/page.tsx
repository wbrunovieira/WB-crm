import ActivityForm from "@/components/activities/ActivityForm";
import { getContactsList } from "@/lib/lists/contacts-list";
import { getDealsList } from "@/lib/lists/deals-list";
import Link from "next/link";

export default async function NewActivityPage() {
  const [contacts, deals] = await Promise.all([
    getContactsList(),
    getDealsList(),
  ]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Link
            href="/activities"
            className="text-gray-500 hover:text-gray-700"
          >
            ← Voltar
          </Link>
        </div>
        <h1 className="mt-4 text-3xl font-bold">Nova Atividade</h1>
      </div>

      <div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow">
        <ActivityForm contacts={contacts} deals={deals} />
      </div>
    </div>
  );
}
