import { getBusinessLines } from "@/actions/business-lines";
import { BusinessLineForm } from "@/components/admin/BusinessLineForm";
import { BusinessLinesList } from "@/components/admin/BusinessLinesList";
import Link from "next/link";

export default async function BusinessLinesPage() {
  const businessLines = await getBusinessLines();

  return (
    <div className="p-8">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
          ← Voltar para Admin
        </Link>
      </div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Linhas de Negócio</h1>
          <p className="mt-2 text-gray-600">
            Gerencie as frentes de negócio da empresa
          </p>
        </div>
        <Link
          href="/admin/products"
          className="rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
        >
          Gerenciar Produtos
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Formulário de Criação */}
        <div className="lg:col-span-1">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">
              Nova Linha de Negócio
            </h2>
            <BusinessLineForm />
          </div>
        </div>

        {/* Lista de Business Lines */}
        <div className="lg:col-span-2">
          <BusinessLinesList businessLines={businessLines} />
        </div>
      </div>
    </div>
  );
}
