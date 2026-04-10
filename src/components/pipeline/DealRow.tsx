"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { GripVertical } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Deal = {
  id: string;
  title: string;
  value: number;
  currency: string;
  contact: { id: string; name: string; email: string | null } | null;
  organization: { id: string; name: string } | null;
};

type DealRowProps = {
  deal: Deal;
  displayCurrency: string;
  stageProbability: number;
  isDragging?: boolean;
};

export default function DealRow({
  deal,
  displayCurrency,
  stageProbability,
  isDragging = false,
}: DealRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
    zIndex: isSortableDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border bg-white px-4 py-3 transition-shadow ${
        isDragging
          ? "shadow-lg ring-2 ring-primary"
          : "border-gray-200 hover:border-purple-300 hover:shadow-sm"
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
        tabIndex={-1}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Title */}
      <Link
        href={`/deals/${deal.id}`}
        className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 hover:text-primary"
        onClick={(e) => e.stopPropagation()}
      >
        {deal.title}
      </Link>

      {/* Contact / Org */}
      <div className="hidden w-40 min-w-0 sm:block">
        {deal.contact ? (
          <Link
            href={`/contacts/${deal.contact.id}`}
            className="block truncate text-xs text-gray-500 hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {deal.contact.name}
          </Link>
        ) : deal.organization ? (
          <Link
            href={`/organizations/${deal.organization.id}`}
            className="block truncate text-xs text-gray-500 hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {deal.organization.name}
          </Link>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </div>

      {/* Probability */}
      <div className="hidden w-16 flex-shrink-0 text-right sm:block">
        <span className="text-xs text-gray-500">{stageProbability}%</span>
      </div>

      {/* Value */}
      <div className="w-28 flex-shrink-0 text-right">
        <span className="text-sm font-semibold text-gray-900">
          {formatCurrency(deal.value, displayCurrency)}
        </span>
      </div>
    </div>
  );
}
