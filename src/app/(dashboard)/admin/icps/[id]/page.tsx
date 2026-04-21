import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Edit, Clock } from "lucide-react";
import { backendFetch } from "@/lib/backend/client";
import { ICPVersionHistory } from "@/components/admin/ICPVersionHistory";

interface ICPDetailPageProps {
  params: Promise<{ id: string }>;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-gray-100 text-gray-700" },
  active: { label: "Ativo", color: "bg-green-100 text-green-700" },
  archived: { label: "Arquivado", color: "bg-yellow-100 text-yellow-700" },
};

export default async function ICPDetailPage({ params }: ICPDetailPageProps) {
  const { id } = await params;

  const icp = await backendFetch<{ id: string; name: string; slug: string; content: string; status: string } | null>(
    `/icps/${id}`
  ).catch(() => null);

  if (!icp) {
    notFound();
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/admin/icps"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para ICPs
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">{icp.name}</h1>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                statusLabels[icp.status]?.color || "bg-gray-100 text-gray-700"
              }`}
            >
              {statusLabels[icp.status]?.label || icp.status}
            </span>
          </div>
          <Link
            href={`/admin/icps/${id}/edit`}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Link>
        </div>
        <p className="mt-1 text-sm text-gray-500">/{icp.slug}</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Descrição do ICP
            </h2>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-gray-700">
                {icp.content}
              </pre>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Clock className="h-5 w-5 text-primary" />
              Histórico de Versões
            </h2>
            <ICPVersionHistory icpId={id} />
          </div>
        </div>
      </div>
    </div>
  );
}
