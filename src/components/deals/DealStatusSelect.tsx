"use client";

import { useState } from "react";
import { useUpdateDeal } from "@/hooks/deals/use-deals";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { toast } from "sonner";

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
    expectedCloseDate: string | Date | null;
  };
};

function fireConfetti() {
  // First burst
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
  });

  // Second burst after small delay
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
    });
  }, 150);

  // Third burst
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
    });
  }, 300);
}

export function DealStatusSelect({
  dealId,
  currentStatus,
  dealData,
}: DealStatusSelectProps) {
  const router = useRouter();
  const updateMutation = useUpdateDeal();
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);

  const handleStatusChange = async (newStatus: "open" | "won" | "lost") => {
    if (newStatus === selectedStatus) return;

    setSelectedStatus(newStatus);

    try {
      await updateMutation.mutateAsync({
        id: dealId,
        ...dealData,
        status: newStatus,
        contactId: dealData.contactId ?? undefined,
        organizationId: dealData.organizationId ?? undefined,
        expectedCloseDate: dealData.expectedCloseDate
          ? new Date(dealData.expectedCloseDate).toISOString().split("T")[0]
          : undefined,
      });
      router.refresh();

      if (newStatus === "won") {
        fireConfetti();
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      setSelectedStatus(currentStatus);
      toast.error("Erro ao atualizar status");
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

  return (
    <select
      value={selectedStatus}
      onChange={(e) => handleStatusChange(e.target.value as "open" | "won" | "lost")}
      disabled={updateMutation.isPending}
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${getStatusStyles(selectedStatus)} hover:opacity-80`}
    >
      <option value="open">Aberto</option>
      <option value="won">Ganho</option>
      <option value="lost">Perdido</option>
    </select>
  );
}
