import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCadences } from "@/actions/cadences";
import { backendFetch } from "@/lib/backend/client";
import { CadenceForm } from "@/components/admin/CadenceForm";
import { CadencesList } from "@/components/admin/CadencesList";

export default async function CadencesPage() {
  const [cadences, icpOptions] = await Promise.all([
    getCadences(),
    backendFetch<{ id: string; name: string }[]>('/icps').catch(() => []),
  ]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Admin
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Cadências de Prospecção
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Gerencie sequências de atividades automatizadas para prospecção de leads.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <CadenceForm icps={icpOptions as { id: string; name: string }[]} />
        <CadencesList cadences={cadences} />
      </div>
    </div>
  );
}
