"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { CadenceEditModal } from "./CadenceEditModal";
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

  const handleEditSuccess = () => {
    setShowEditModal(false);
    router.refresh();
  };

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
          <button
            onClick={() => setShowEditModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Editar
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500">/{cadence.slug}</p>
      </div>

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
