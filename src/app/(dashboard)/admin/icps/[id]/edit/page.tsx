import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getICPById } from "@/actions/icps";
import { ICPEditForm } from "@/components/admin/ICPEditForm";

interface ICPEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function ICPEditPage({ params }: ICPEditPageProps) {
  const { id } = await params;
  const icp = await getICPById(id);

  if (!icp) {
    notFound();
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href={`/admin/icps/${id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para detalhes
        </Link>

        <h1 className="text-2xl font-bold text-gray-900">Editar ICP</h1>
        <p className="mt-1 text-sm text-gray-500">
          Alterações criarão uma nova versão no histórico.
        </p>
      </div>

      <div className="max-w-2xl">
        <ICPEditForm icp={icp} />
      </div>
    </div>
  );
}
