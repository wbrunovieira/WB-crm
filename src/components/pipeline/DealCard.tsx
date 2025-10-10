"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Clock, CalendarPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScheduleNextActivityModal } from "../activities/ScheduleNextActivityModal";

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
  activities?: Array<{
    id: string;
    subject: string;
    type: string;
    dueDate: Date | null;
  }>;
};

type DealCardProps = {
  deal: Deal;
  isDragging?: boolean;
};

export default function DealCard({ deal, isDragging }: DealCardProps) {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [availableData, setAvailableData] = useState<{
    deals: Array<{ id: string; title: string }>;
    contacts: Array<{ id: string; name: string }>;
    leads: Array<{ id: string; businessName: string }>;
    partners: Array<{ id: string; name: string }>;
  } | null>(null);

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

  const nextActivity = deal.activities && deal.activities.length > 0 ? deal.activities[0] : null;
  const hasNoActivity = !nextActivity;

  const handleScheduleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!availableData) {
      try {
        const [dealsRes, contactsRes, leadsRes, partnersRes] = await Promise.all([
          fetch("/api/deals"),
          fetch("/api/contacts"),
          fetch("/api/leads"),
          fetch("/api/partners"),
        ]);

        const [deals, contacts, leads, partners] = await Promise.all([
          dealsRes.ok ? dealsRes.json() : [],
          contactsRes.ok ? contactsRes.json() : [],
          leadsRes.ok ? leadsRes.json() : [],
          partnersRes.ok ? partnersRes.json() : [],
        ]);

        setAvailableData({
          deals: deals.map((d: { id: string; title: string }) => ({ id: d.id, title: d.title })),
          contacts: contacts.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })),
          leads: leads.map((l: { id: string; businessName: string }) => ({ id: l.id, businessName: l.businessName })),
          partners: partners.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })),
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        setAvailableData({
          deals: [],
          contacts: [],
          leads: [],
          partners: [],
        });
      }
    }
    setShowScheduleModal(true);
  };

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case "call": return "📞";
      case "meeting": return "📅";
      case "email": return "✉️";
      case "task": return "📋";
      case "whatsapp": return "💬";
      case "visit": return "📍";
      case "instagram": return "📷";
      default: return "📌";
    }
  };

  const getBorderClass = () => {
    if (hasNoActivity) return "border-2 border-red-500";
    return "border border-gray-200";
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`group cursor-grab rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md active:cursor-grabbing ${
          isDragging ? "shadow-lg" : ""
        } ${getBorderClass()}`}
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

        {/* Activity Section */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          {nextActivity ? (
            <Link
              href={`/activities/${nextActivity.id}`}
              className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700"
              onClick={(e) => e.stopPropagation()}
            >
              <Clock className="h-3 w-3 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span>{getActivityTypeIcon(nextActivity.type)}</span>
                  <span className="truncate">{nextActivity.subject}</span>
                </div>
                {nextActivity.dueDate && (
                  <span className="text-blue-500">
                    {formatDistanceToNow(new Date(nextActivity.dueDate), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                )}
              </div>
            </Link>
          ) : (
            <button
              onClick={handleScheduleClick}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-red-50 border border-red-200 px-2 py-1.5 text-xs text-red-600 hover:bg-red-100 transition-colors font-medium"
              title="Agendar Atividade"
            >
              <CalendarPlus className="h-3 w-3" />
              <span>Agendar</span>
            </button>
          )}
        </div>
      </div>

      {/* Schedule Activity Modal */}
      {showScheduleModal && availableData && (
        <ScheduleNextActivityModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          previousActivity={{
            dealId: deal.id,
            dealTitle: deal.title,
            contactId: deal.contact?.id || null,
            contactName: deal.contact?.name,
          }}
          availableData={availableData}
        />
      )}
    </>
  );
}
