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
import DealRow from "./DealRow";
import PipelineListView from "./PipelineListView";
import { AVAILABLE_CURRENCIES } from "@/lib/utils";
import { toast } from "sonner";
import { LayoutGrid, List } from "lucide-react";

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

type ViewMode = "kanban" | "list";

export default function PipelineBoard({ pipeline }: PipelineBoardProps) {
  const router = useRouter();
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState("BRL");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

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
      toast.error(
        error instanceof Error ? error.message : "Erro ao mover negócio"
      );
    }
  };

  // Find probability of the active deal's current stage (for list drag overlay)
  const activeDealStageProbability = activeDeal
    ? (pipeline.stages.find((s) => s.deals.some((d) => d.id === activeDeal.id))
        ?.probability ?? 0)
    : 0;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-8 pb-2 pt-4">
          {/* View toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "kanban"
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <List className="h-4 w-4" />
              Lista
            </button>
          </div>

          {/* Currency selector */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="currency-select"
              className="text-sm font-medium text-gray-700"
            >
              Moeda do Total:
            </label>
            <select
              id="currency-select"
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

        {/* Kanban view */}
        {viewMode === "kanban" && (
          <div className="flex flex-1 gap-4 overflow-x-auto px-8 pb-8 pt-2"
               style={{ background: "linear-gradient(135deg, #f5f0fa 0%, #ede8f5 50%, #e8e0f0 100%)" }}>
            {pipeline.stages.map((stage) => (
              <StageColumn
                key={stage.id}
                stage={stage}
                isDragging={isDragging}
                displayCurrency={displayCurrency}
              />
            ))}
          </div>
        )}

        {/* List view */}
        {viewMode === "list" && (
          <div className="flex-1 overflow-y-auto">
            <PipelineListView
              stages={pipeline.stages}
              isDragging={isDragging}
              displayCurrency={displayCurrency}
              activeDealId={activeDeal?.id ?? null}
            />
          </div>
        )}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeDeal ? (
          viewMode === "kanban" ? (
            <div className="rotate-3 opacity-80">
              <DealCard deal={activeDeal} isDragging />
            </div>
          ) : (
            <div className="opacity-90 shadow-xl">
              <DealRow
                deal={activeDeal}
                displayCurrency={displayCurrency}
                stageProbability={activeDealStageProbability}
                isDragging
              />
            </div>
          )
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
