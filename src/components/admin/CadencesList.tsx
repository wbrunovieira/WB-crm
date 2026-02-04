"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Trash2, Zap, Target, Users } from "lucide-react";
import { deleteCadence, updateCadence } from "@/actions/cadences";
import { CADENCE_STATUS_LABELS, type CadenceStatus } from "@/lib/validations/cadence";

type Cadence = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  objective: string | null;
  durationDays: number;
  status: string;
  icp: {
    id: string;
    name: string;
    slug: string;
  } | null;
  _count: {
    steps: number;
    leadCadences: number;
  };
};

type CadencesListProps = {
  cadences: Cadence[];
};

export function CadencesList({ cadences }: CadencesListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleToggleStatus = async (cadence: Cadence) => {
    setLoading(cadence.id);
    try {
      const newStatus = cadence.status === "active" ? "archived" : "active";
      await updateCadence(cadence.id, { status: newStatus });
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao atualizar status");
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (cadence: Cadence) => {
    if (!confirm(`Excluir cadência "${cadence.name}"?`)) return;

    setLoading(cadence.id);
    try {
      await deleteCadence(cadence.id);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao excluir");
    } finally {
      setLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700",
      active: "bg-green-100 text-green-700",
      archived: "bg-yellow-100 text-yellow-700",
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || colors.draft}`}>
        {CADENCE_STATUS_LABELS[status as CadenceStatus] || status}
      </span>
    );
  };

  if (cadences.length === 0) {
    return (
      <div className="col-span-2 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <Zap className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          Nenhuma cadência
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Crie sua primeira cadência de prospecção.
        </p>
      </div>
    );
  }

  return (
    <div className="col-span-2 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">
        Cadências ({cadences.length})
      </h2>

      <div className="space-y-3">
        {cadences.map((cadence) => (
          <div
            key={cadence.id}
            className="rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/cadences/${cadence.id}`}
                    className="text-lg font-medium text-gray-900 hover:text-primary"
                  >
                    {cadence.name}
                  </Link>
                  {getStatusBadge(cadence.status)}
                </div>

                {cadence.objective && (
                  <p className="mt-1 text-sm text-gray-600">
                    {cadence.objective}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Zap className="h-4 w-4" />
                    {cadence._count.steps} etapas
                  </span>
                  <span>{cadence.durationDays} dias</span>
                  {cadence.icp && (
                    <span className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      {cadence.icp.name}
                    </span>
                  )}
                  {cadence._count.leadCadences > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {cadence._count.leadCadences} leads
                    </span>
                  )}
                </div>
              </div>

              <div className="ml-4 flex gap-2">
                <button
                  onClick={() => handleToggleStatus(cadence)}
                  disabled={loading === cadence.id}
                  className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                  title={cadence.status === "active" ? "Arquivar" : "Ativar"}
                >
                  {cadence.status === "active" ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(cadence)}
                  disabled={loading === cadence.id}
                  className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
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
