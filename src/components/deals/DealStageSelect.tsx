"use client";

import { useState, useEffect } from "react";
import { updateDealStage } from "@/actions/deals";
import { getStages } from "@/actions/stages";
import { useRouter } from "next/navigation";

type Stage = {
  id: string;
  name: string;
  pipeline: {
    id: string;
    name: string;
    isDefault: boolean;
  };
};

type DealStageSelectProps = {
  dealId: string;
  currentStageId: string;
};

export function DealStageSelect({
  dealId,
  currentStageId,
}: DealStageSelectProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState(currentStageId);
  const [stages, setStages] = useState<Stage[]>([]);

  useEffect(() => {
    async function loadStages() {
      try {
        const data = await getStages();
        setStages(data);
      } catch (error) {
        console.error("Erro ao carregar estágios:", error);
      }
    }
    loadStages();
  }, []);

  const handleStageChange = async (newStageId: string) => {
    if (newStageId === selectedStageId) return;

    setIsUpdating(true);
    setSelectedStageId(newStageId);

    try {
      await updateDealStage(dealId, newStageId);
      router.refresh();
    } catch (error) {
      console.error("Erro ao atualizar estágio:", error);
      // Revert on error
      setSelectedStageId(currentStageId);
      alert("Erro ao atualizar estágio");
    } finally {
      setIsUpdating(false);
    }
  };

  if (stages.length === 0) {
    return <span className="text-xs text-gray-500">Carregando...</span>;
  }

  return (
    <select
      value={selectedStageId}
      onChange={(e) => handleStageChange(e.target.value)}
      disabled={isUpdating}
      className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-primary border-0 cursor-pointer hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {stages.map((stage) => (
        <option key={stage.id} value={stage.id}>
          {stage.name}
        </option>
      ))}
    </select>
  );
}
