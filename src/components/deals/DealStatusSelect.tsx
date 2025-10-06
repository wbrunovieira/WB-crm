"use client";

import { useState } from "react";
import { updateDeal } from "@/actions/deals";
import { useRouter } from "next/navigation";
import { ConvertDealToProjectModal } from "@/components/projects/ConvertDealToProjectModal";

type DealStatusSelectProps = {
  dealId: string;
  currentStatus: "open" | "won" | "lost";
  dealData: {
    title: string;
    value: number;
    currency: string;
    stageId: string;
    contactId: string | null;
    organizationId: string | null;
    expectedCloseDate: Date | null;
  };
};

export function DealStatusSelect({
  dealId,
  currentStatus,
  dealData,
}: DealStatusSelectProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [showProjectModal, setShowProjectModal] = useState(false);

  const handleStatusChange = async (newStatus: "open" | "won" | "lost") => {
    if (newStatus === selectedStatus) return;

    setIsUpdating(true);
    setSelectedStatus(newStatus);

    try {
      await updateDeal(dealId, {
        ...dealData,
        status: newStatus,
      });
      router.refresh();

      // Show project modal if status changed to "won" and deal has organization
      if (newStatus === "won" && dealData.organizationId) {
        setShowProjectModal(true);
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      // Revert on error
      setSelectedStatus(currentStatus);
      alert("Erro ao atualizar status");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "won":
        return "bg-green-100 text-green-800";
      case "lost":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "won":
        return "Ganho";
      case "lost":
        return "Perdido";
      default:
        return "Aberto";
    }
  };

  return (
    <>
      <select
        value={selectedStatus}
        onChange={(e) => handleStatusChange(e.target.value as "open" | "won" | "lost")}
        disabled={isUpdating}
        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${getStatusStyles(selectedStatus)} hover:opacity-80`}
      >
        <option value="open">Aberto</option>
        <option value="won">Ganho</option>
        <option value="lost">Perdido</option>
      </select>

      <ConvertDealToProjectModal
        dealId={dealId}
        dealTitle={dealData.title}
        dealValue={dealData.value}
        organizationId={dealData.organizationId}
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
      />
    </>
  );
}
