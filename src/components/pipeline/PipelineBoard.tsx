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
import { AVAILABLE_CURRENCIES } from "@/lib/utils";

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
  const [displayCurrency, setDisplayCurrency] = useState("BRL");

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
      <div className="flex h-full flex-col">
        {/* Currency Selector */}
        <div className="mb-4 flex justify-end px-8 pt-4">
          <div className="flex items-center gap-2">
            <label htmlFor="currency-select-kanban" className="text-sm font-medium text-gray-700">
              Moeda do Total:
            </label>
            <select
              id="currency-select-kanban"
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {AVAILABLE_CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Kanban Columns */}
        <div className="flex flex-1 gap-4 overflow-x-auto px-8 pb-8">
          {pipeline.stages.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              isDragging={isDragging}
              displayCurrency={displayCurrency}
            />
          ))}
        </div>
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
