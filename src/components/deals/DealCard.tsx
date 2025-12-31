"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, User, Calendar, TrendingUp, Edit, Clock, Trophy, CalendarPlus } from "lucide-react";
import { DealStageSelect } from "./DealStageSelect";
import { DealStatusSelect } from "./DealStatusSelect";
import { ScheduleNextActivityModal } from "../activities/ScheduleNextActivityModal";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OwnerBadge } from "@/components/shared/OwnerBadge";

interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  status: string;
  expectedCloseDate: Date | null;
  contact: { id: string; name: string } | null;
  organization: { id: string; name: string } | null;
  stage: {
    id: string;
    name: string;
    pipeline: { id: string; name: string };
  };
  createdAt: Date;
  activities?: Array<{
    id: string;
    subject: string;
    type: string;
    dueDate: Date | null;
  }>;
  owner?: { id: string; name: string | null };
}

interface DealCardProps {
  deal: Deal;
  isAdmin?: boolean;
  currentUserId?: string;
}

export function DealCard({ deal, isAdmin = false, currentUserId = "" }: DealCardProps) {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [availableData, setAvailableData] = useState<{
    deals: Array<{ id: string; title: string }>;
    contacts: Array<{ id: string; name: string }>;
    leads: Array<{ id: string; businessName: string }>;
    partners: Array<{ id: string; name: string }>;
  } | null>(null);

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    }).format(value);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const nextActivity = deal.activities && deal.activities.length > 0 ? deal.activities[0] : null;
  const hasNoActivity = !nextActivity && deal.status === "open";
  const isWon = deal.status === "won";

  // Fetch available data when user clicks to schedule
  const handleScheduleClick = async () => {
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
    if (isWon) return "border-[3px] border-green-500";
    if (hasNoActivity) return "border-[3px] border-red-500 animate-pulse-border";
    return "border border-gray-200 hover:border-primary/50";
  };

  return (
    <div className={`group relative overflow-hidden rounded-lg bg-white p-6 shadow-sm transition-all hover:shadow-md ${getBorderClass()}`}>
      {/* Won Badge */}
      {isWon && (
        <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-green-700 border border-green-300">
          <Trophy className="h-4 w-4" />
          <span className="text-xs font-semibold">Ganho</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/deals/${deal.id}`}
              className="text-lg font-semibold text-gray-900 hover:text-primary transition-colors line-clamp-2"
            >
              {deal.title}
            </Link>
            {isAdmin && deal.owner && (
              <OwnerBadge
                ownerName={deal.owner.name || ""}
                isCurrentUser={deal.owner.id === currentUserId}
              />
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-gray-500">{deal.stage.pipeline.name}</span>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-gray-500">{deal.stage.name}</span>
          </div>
        </div>
        {!isWon && (
          <Link
            href={`/deals/${deal.id}/edit`}
            className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-primary transition-colors"
            title="Editar"
          >
            <Edit className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Value */}
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <span className="text-2xl font-bold text-primary">
          {formatCurrency(deal.value, deal.currency)}
        </span>
      </div>

      {/* Organization & Contact */}
      <div className="mb-4 space-y-2">
        {deal.organization && (
          <Link
            href={`/organizations/${deal.organization.id}`}
            className="flex items-center gap-2 text-sm text-gray-700 hover:text-primary transition-colors"
          >
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{deal.organization.name}</span>
          </Link>
        )}
        {deal.contact && (
          <Link
            href={`/contacts/${deal.contact.id}`}
            className="flex items-center gap-2 text-sm text-gray-700 hover:text-primary transition-colors"
          >
            <User className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{deal.contact.name}</span>
          </Link>
        )}
      </div>

      {/* Expected Close Date */}
      {deal.expectedCloseDate && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>Previsão: {formatDate(deal.expectedCloseDate)}</span>
        </div>
      )}

      {/* Next Activity or No Activity Warning */}
      {nextActivity ? (
        <Link
          href={`/activities/${nextActivity.id}`}
          className="mb-4 flex items-center gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-700 hover:bg-blue-100 transition-colors"
        >
          <Clock className="h-4 w-4 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span>{getActivityTypeIcon(nextActivity.type)}</span>
              <span className="font-medium truncate">{nextActivity.subject}</span>
            </div>
            {nextActivity.dueDate && (
              <span className="text-xs text-blue-600">
                {formatDistanceToNow(new Date(nextActivity.dueDate), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            )}
          </div>
        </Link>
      ) : deal.status === "open" && (
        <button
          onClick={handleScheduleClick}
          className="mb-4 w-full flex items-center justify-center gap-2 rounded-md bg-red-50 border-2 border-red-300 p-3 text-sm text-red-700 hover:bg-red-100 transition-all font-medium"
        >
          <CalendarPlus className="h-4 w-4" />
          <span>Agendar Atividade</span>
        </button>
      )}

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

      {/* Status & Stage */}
      <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <DealStatusSelect
            dealId={deal.id}
            currentStatus={deal.status as "open" | "won" | "lost"}
            dealData={{
              title: deal.title,
              value: deal.value,
              currency: deal.currency,
              stageId: deal.stage.id,
              contactId: deal.contact?.id || null,
              organizationId: deal.organization?.id || null,
              expectedCloseDate: deal.expectedCloseDate,
            }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Estágio</label>
          <DealStageSelect dealId={deal.id} currentStageId={deal.stage.id} />
        </div>
      </div>
    </div>
  );
}
