"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CadenceEditModal } from "./CadenceEditModal";
import { cancelAllActiveCadences } from "@/actions/lead-cadences";
import { CADENCE_STATUS_LABELS, type CadenceStatus } from "@/lib/validations/cadence";

type ICP = {
  id: string;
  name: string;
};

type Cadence = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  objective: string | null;
  durationDays: number;
  icpId: string | null;
  status: string;
  icp: {
    id: string;
    name: string;
  } | null;
  activeLeadCadencesCount?: number;
};

type CadenceHeaderProps = {
  cadence: Cadence;
  icps: ICP[];
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-700",
  archived: "bg-yellow-100 text-yellow-700",
};

export function CadenceHeader({ cadence, icps }: CadenceHeaderProps) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleEditSuccess = () => {
    setShowEditModal(false);
    router.refresh();
  };

  const handleCancelAll = async () => {
    setCancelling(true);
    try {
      const result = await cancelAllActiveCadences(cadence.id);
      toast.success(
        `${result.cancelledCount} cadência(s) cancelada(s). ${result.skippedActivitiesCount} atividade(s) pendente(s) pulada(s).`
      );
      setShowConfirm(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cancelar cadências");
    } finally {
      setCancelling(false);
    }
  };

  const hasActiveCadences = (cadence.activeLeadCadencesCount ?? 0) > 0;

  return (
    <>
      <div className="mb-8">
        <Link
          href="/admin/cadences"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Cadências
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">{cadence.name}</h1>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                statusColors[cadence.status] || "bg-gray-100 text-gray-700"
              }`}
            >
              {CADENCE_STATUS_LABELS[cadence.status as CadenceStatus] || cadence.status}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {hasActiveCadences && (
              <button
                onClick={() => setShowConfirm(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <XCircle className="h-4 w-4" />
                Cancelar Todas ({cadence.activeLeadCadencesCount})
              </button>
            )}
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </button>
          </div>
        </div>
        <p className="mt-1 text-sm text-gray-500">/{cadence.slug}</p>
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Cancelar todas as cadências ativas?</h3>
            <p className="mt-2 text-sm text-gray-600">
              Isso vai cancelar <strong>{cadence.activeLeadCadencesCount}</strong> cadência(s) ativa(s)
              e pular todas as atividades pendentes. Atividades já concluídas, falhadas ou puladas
              não serão afetadas.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={cancelling}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleCancelAll}
                disabled={cancelling}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  "Confirmar Cancelamento"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <CadenceEditModal
          cadence={{
            id: cadence.id,
            name: cadence.name,
            slug: cadence.slug,
            description: cadence.description,
            objective: cadence.objective,
            durationDays: cadence.durationDays,
            icpId: cadence.icpId,
            status: cadence.status,
          }}
          icps={icps}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}
