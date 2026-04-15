import { getSectors } from "@/actions/sectors";
import { SectorsAdminClient } from "@/components/admin/SectorsAdminClient";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function SectorsAdminPage() {
  const sectors = await getSectors();

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar para Administração
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Setores</h1>
        <p className="mt-2 text-gray-600">
          Cadastre setores de mercado com inteligência de prospecção para guiar sua equipe.
        </p>
      </div>

      <SectorsAdminClient sectors={sectors} />
    </div>
  );
}
