"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

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

type DealCardProps = {
  deal: Deal;
  isDragging?: boolean;
};

export default function DealCard({ deal, isDragging }: DealCardProps) {
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
    opacity: isSortableDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group cursor-grab rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md active:cursor-grabbing ${
        isDragging ? "shadow-lg" : ""
      }`}
    >
      <Link
        href={`/deals/${deal.id}`}
        className="block"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="mb-2 font-medium text-gray-900 group-hover:text-primary">
          {deal.title}
        </h4>
      </Link>

      <div className="mb-3">
        <p className="text-lg font-semibold text-primary">
          {formatCurrency(deal.value, deal.currency)}
        </p>
      </div>

      <div className="space-y-1 text-sm text-gray-600">
        {deal.contact && (
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span className="truncate">{deal.contact.name}</span>
          </div>
        )}

        {deal.organization && (
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <span className="truncate">{deal.organization.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}
