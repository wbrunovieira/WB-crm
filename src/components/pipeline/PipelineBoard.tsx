"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { updateDealStage } from "@/actions/deals";
import { useRouter } from "next/navigation";
import StageColumn from "./StageColumn";
import DealCard from "./DealCard";

type Deal = {
  id: string;
  title: string;
  value: number;
  currency: string;
  contact: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  organization: {
    id: string;
    name: string;
  } | null;
};

type Stage = {
  id: string;
  name: string;
  order: number;
  probability: number;
  deals: Deal[];
};

type Pipeline = {
  id: string;
  name: string;
  stages: Stage[];
};

type PipelineBoardProps = {
  pipeline: Pipeline;
};

export default function PipelineBoard({ pipeline }: PipelineBoardProps) {
  const router = useRouter();
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const deal = pipeline.stages
      .flatMap((stage) => stage.deals)
      .find((d) => d.id === active.id);

    if (deal) {
      setActiveDeal(deal);
      setIsDragging(true);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeal(null);
    setIsDragging(false);

    if (!over) return;

    const dealId = active.id as string;
    const newStageId = over.id as string;

    // Find current stage
    const currentStage = pipeline.stages.find((stage) =>
      stage.deals.some((deal) => deal.id === dealId)
    );

    if (!currentStage || currentStage.id === newStageId) return;

    try {
      await updateDealStage(dealId, newStageId);
      router.refresh();
    } catch (error) {
      console.error("Error updating deal stage:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Erro ao mover negócio"
      );
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto p-8">
        {pipeline.stages.map((stage) => (
          <StageColumn
            key={stage.id}
            stage={stage}
            isDragging={isDragging}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDeal ? (
          <div className="rotate-3 opacity-80">
            <DealCard deal={activeDeal} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
