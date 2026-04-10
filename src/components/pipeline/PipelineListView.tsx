"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronDown, ChevronRight } from "lucide-react";
import DealRow from "./DealRow";
import { formatCurrency, calculateTotalInCurrency } from "@/lib/utils";

type Deal = {
  id: string;
  title: string;
  value: number;
  currency: string;
  contact: { id: string; name: string; email: string | null } | null;
  organization: { id: string; name: string } | null;
};

type Stage = {
  id: string;
  name: string;
  order: number;
  probability: number;
  deals: Deal[];
};

type StageRowSectionProps = {
  stage: Stage;
  isDragging: boolean;
  displayCurrency: string;
  activeDealId: string | null;
};

function StageRowSection({
  stage,
  isDragging,
  displayCurrency,
  activeDealId,
}: StageRowSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  const totalValue = calculateTotalInCurrency(stage.deals, displayCurrency);
  const dealIds = stage.deals.map((d) => d.id);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Stage header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
        )}

        <span className="flex-1 font-semibold text-gray-900">{stage.name}</span>

        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          {stage.deals.length} {stage.deals.length === 1 ? "negócio" : "negócios"}
        </span>

        <div className="flex items-center gap-2">
          {/* Probability bar */}
          <div className="hidden w-20 sm:block">
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${stage.probability}%` }}
              />
            </div>
            <p className="mt-0.5 text-center text-[10px] text-gray-400">
              {stage.probability}%
            </p>
          </div>

          <span className="text-sm font-semibold text-gray-700">
            {formatCurrency(totalValue, displayCurrency)}
          </span>
        </div>
      </button>

      {/* Deal rows — drop zone */}
      {!collapsed && (
        <div
          ref={setNodeRef}
          className={`border-t transition-colors ${
            isOver
              ? "bg-blue-50"
              : isDragging
                ? "bg-gray-50"
                : "bg-white"
          }`}
        >
          {/* Column headers */}
          <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            <span className="w-4 flex-shrink-0" />
            <span className="flex-1">Negócio</span>
            <span className="hidden w-40 sm:block">Contato / Empresa</span>
            <span className="hidden w-16 text-right sm:block">Prob.</span>
            <span className="w-28 text-right">Valor</span>
          </div>

          <SortableContext items={dealIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5 p-3">
              {stage.deals.map((deal) => (
                <DealRow
                  key={deal.id}
                  deal={deal}
                  displayCurrency={displayCurrency}
                  stageProbability={stage.probability}
                  isDragging={deal.id === activeDealId}
                />
              ))}

              {stage.deals.length === 0 && (
                <div
                  className={`flex h-16 items-center justify-center rounded-lg border-2 border-dashed text-sm text-gray-400 transition-colors ${
                    isOver ? "border-primary text-primary" : "border-gray-200"
                  }`}
                >
                  {isOver ? "Solte aqui" : "Arraste negócios para esta etapa"}
                </div>
              )}
            </div>
          </SortableContext>
        </div>
      )}
    </div>
  );
}

type PipelineListViewProps = {
  stages: Stage[];
  isDragging: boolean;
  displayCurrency: string;
  activeDealId: string | null;
};

export default function PipelineListView({
  stages,
  isDragging,
  displayCurrency,
  activeDealId,
}: PipelineListViewProps) {
  return (
    <div className="space-y-3 px-8 pb-8 pt-4">
      {stages.map((stage) => (
        <StageRowSection
          key={stage.id}
          stage={stage}
          isDragging={isDragging}
          displayCurrency={displayCurrency}
          activeDealId={activeDealId}
        />
      ))}
    </div>
  );
}
