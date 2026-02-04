"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Trash2, FileText, Users, Building2, History } from "lucide-react";
import { deleteICP, updateICP } from "@/actions/icps";

interface ICP {
  id: string;
  name: string;
  slug: string;
  content: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    id: string;
    name: string | null;
  };
  _count: {
    leads: number;
    organizations: number;
    versions: number;
  };
}

interface ICPsListProps {
  icps: ICP[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-gray-100 text-gray-700" },
  active: { label: "Ativo", color: "bg-green-100 text-green-700" },
  archived: { label: "Arquivado", color: "bg-yellow-100 text-yellow-700" },
};

export function ICPsList({ icps }: ICPsListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleToggleStatus = async (icp: ICP) => {
    setLoading(icp.id);
    try {
      const newStatus = icp.status === "active" ? "archived" : "active";
      await updateICP(icp.id, {
        status: newStatus,
        changeReason: `Status alterado para ${statusLabels[newStatus].label}`
      });
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao alterar status");
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (icp: ICP) => {
    const totalLinks = icp._count.leads + icp._count.organizations;

    if (totalLinks > 0) {
      alert(
        `Não é possível excluir "${icp.name}" pois está vinculado a ${icp._count.leads} lead(s) e ${icp._count.organizations} organização(ões).`
      );
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir "${icp.name}"?`)) return;

    setLoading(icp.id);
    try {
      await deleteICP(icp.id);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao excluir ICP");
    } finally {
      setLoading(null);
    }
  };

  if (icps.length === 0) {
    return (
      <div className="col-span-2 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          Nenhum ICP cadastrado
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Crie seu primeiro ICP para começar a categorizar leads e organizações.
        </p>
      </div>
    );
  }

  return (
    <div className="col-span-2 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">
        ICPs Cadastrados ({icps.length})
      </h2>

      <div className="space-y-3">
        {icps.map((icp) => (
          <div
            key={icp.id}
            className={`rounded-lg border bg-white p-4 shadow-sm transition-opacity ${
              icp.status === "archived" ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/icps/${icp.id}`}
                    className="text-lg font-medium text-gray-900 hover:text-primary"
                  >
                    {icp.name}
                  </Link>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      statusLabels[icp.status]?.color || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {statusLabels[icp.status]?.label || icp.status}
                  </span>
                </div>

                <p className="mt-1 text-sm text-gray-500">/{icp.slug}</p>

                <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                  {icp.content}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {icp._count.leads} lead(s)
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {icp._count.organizations} org(s)
                  </span>
                  <span className="flex items-center gap-1">
                    <History className="h-3.5 w-3.5" />
                    v{icp._count.versions}
                  </span>
                  <span>
                    Por: {icp.owner.name || "Desconhecido"}
                  </span>
                </div>
              </div>

              <div className="ml-4 flex gap-2">
                <Link
                  href={`/admin/icps/${icp.id}`}
                  className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-primary"
                  title="Ver detalhes"
                >
                  <FileText className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => handleToggleStatus(icp)}
                  disabled={loading === icp.id}
                  className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-primary disabled:opacity-50"
                  title={icp.status === "active" ? "Arquivar" : "Ativar"}
                >
                  {icp.status === "active" ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(icp)}
                  disabled={loading === icp.id}
                  className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-50"
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
