"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import DealCard from "./DealCard";
import { formatCurrency, calculateTotalInCurrency } from "@/lib/utils";

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

type StageColumnProps = {
  stage: Stage;
  isDragging: boolean;
  displayCurrency?: string;
};

export default function StageColumn({ stage, isDragging, displayCurrency = "BRL" }: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  const totalValue = calculateTotalInCurrency(stage.deals, displayCurrency);
  const dealIds = stage.deals.map((deal) => deal.id);

  return (
    <div className="flex w-80 flex-shrink-0 flex-col">
      <div className="mb-4 rounded-lg bg-white p-4 shadow">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{stage.name}</h3>
            <p className="text-sm text-gray-500">
              {stage.deals.length} {stage.deals.length === 1 ? "negócio" : "negócios"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(totalValue, displayCurrency)}
            </p>
          </div>
        </div>
        <div className="mt-2">
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${stage.probability}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {stage.probability}% de probabilidade
          </p>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 space-y-3 rounded-lg border-2 border-dashed p-3 transition-colors ${
          isOver
            ? "border-primary bg-blue-50"
            : isDragging
              ? "border-gray-300 bg-gray-50"
              : "border-transparent bg-gray-100"
        }`}
        style={{ minHeight: "500px" }}
      >
        <SortableContext items={dealIds} strategy={verticalListSortingStrategy}>
          {stage.deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </SortableContext>

        {stage.deals.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400">
              Arraste negócios para cá
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
