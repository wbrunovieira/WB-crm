"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trophy, CalendarPlus } from "lucide-react";
import { DealStageSelect } from "./DealStageSelect";
import { DealStatusSelect } from "./DealStatusSelect";
import { DealCard } from "./DealCard";
import { ScheduleNextActivityModal } from "../activities/ScheduleNextActivityModal";
import { calculateTotalInCurrency, AVAILABLE_CURRENCIES } from "@/lib/utils";
import { EntityAccessBadges } from "@/components/shared/EntityAccessBadges";

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

interface DealsListViewProps {
  deals: Deal[];
  groupBy: string;
  displayMode?: string;
  isAdmin?: boolean;
  currentUserId?: string;
  sharedUsersMap?: Record<string, { id: string; name: string }[]>;
}

type GroupedDeals = {
  [key: string]: {
    deals: Deal[];
    total: number;
  };
};

export function DealsListView({ deals, groupBy, displayMode = "table", isAdmin = false, currentUserId = "", sharedUsersMap = {} }: DealsListViewProps) {
  const [displayCurrency, setDisplayCurrency] = useState("BRL");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [availableData, setAvailableData] = useState<{
    deals: Array<{ id: string; title: string }>;
    contacts: Array<{ id: string; name: string }>;
    leads: Array<{ id: string; businessName: string }>;
    partners: Array<{ id: string; name: string }>;
  } | null>(null);

  // Grouping logic
  const groupedDeals: GroupedDeals | null = (() => {
    if (groupBy === "none") return null;

    const groups: GroupedDeals = {};

    deals.forEach((deal) => {
      let key: string;

      switch (groupBy) {
        case "stage":
          key = deal.stage.id;
          break;
        case "value":
          // Group by value ranges
          const value = deal.value;
          if (value < 10000) {
            key = "0-10k";
          } else if (value < 50000) {
            key = "10k-50k";
          } else if (value < 100000) {
            key = "50k-100k";
          } else {
            key = "100k+";
          }
          break;
        case "status":
          key = deal.status;
          break;
        default:
          key = "other";
      }

      if (!groups[key]) {
        groups[key] = { deals: [], total: 0 };
      }

      groups[key].deals.push(deal);
    });

    // Calculate totals in display currency for each group
    Object.keys(groups).forEach((key) => {
      groups[key].total = calculateTotalInCurrency(groups[key].deals, displayCurrency);
    });

    // Sort groups by total value descending
    const sortedGroups: GroupedDeals = {};
    Object.keys(groups)
      .sort((a, b) => groups[b].total - groups[a].total)
      .forEach((key) => {
        sortedGroups[key] = groups[key];
      });

    return sortedGroups;
  })();

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

  // Fetch available data when user clicks to schedule
  const handleScheduleClick = async (deal: Deal) => {
    setSelectedDeal(deal);

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

  const renderDealRow = (deal: Deal) => {
    const nextActivity = deal.activities && deal.activities.length > 0 ? deal.activities[0] : null;
    const hasNoActivity = !nextActivity && deal.status === "open";
    const isWon = deal.status === "won";

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

    const getRowStyle = () => {
      if (isWon) {
        return { borderLeft: "4px solid #22c55e" };
      }
      if (hasNoActivity) {
        return {
          borderLeft: "4px solid #ef4444",
          animation: "pulse-border 2s ease-in-out infinite"
        };
      }
      return undefined;
    };

    const getRowClass = () => {
      if (isWon) return "hover:bg-gray-50 bg-green-50/10";
      if (hasNoActivity) return "hover:bg-gray-50 bg-red-50/10";
      return "hover:bg-gray-50";
    };

    return (
      <tr
        key={deal.id}
        className={getRowClass()}
        style={getRowStyle()}
      >
        <td className="whitespace-nowrap px-6 py-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/deals/${deal.id}`}
                className="text-gray-700 hover:text-primary font-medium text-base"
              >
                {deal.title}
              </Link>
              {isAdmin && deal.owner && (
                <EntityAccessBadges
                  owner={{ id: deal.owner.id, name: deal.owner.name || "" }}
                  sharedWith={sharedUsersMap[deal.id] || []}
                  currentUserId={currentUserId}
                  compact
                />
              )}
              {isWon && (
                <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-green-700 border border-green-300">
                  <Trophy className="h-3 w-3" />
                  <span className="text-xs font-semibold">Ganho</span>
                </div>
              )}
            </div>
            {nextActivity ? (
              <Link
                href={`/activities/${nextActivity.id}`}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <span>{getActivityTypeIcon(nextActivity.type)}</span>
                <span className="truncate max-w-[200px]">{nextActivity.subject}</span>
                {nextActivity.dueDate && (
                  <span className="text-blue-500">
                    • {formatDistanceToNow(new Date(nextActivity.dueDate), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                )}
              </Link>
            ) : deal.status === "open" && (
              <button
                onClick={() => handleScheduleClick(deal)}
                className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-red-600 hover:bg-red-100 transition-colors border border-red-200"
                title="Agendar Atividade"
              >
                <CalendarPlus className="h-3 w-3" />
              </button>
            )}
          </div>
        </td>
      <td className="whitespace-nowrap px-6 py-4">
        {deal.organization ? (
          <Link
            href={`/organizations/${deal.organization.id}`}
            className="text-gray-900 hover:text-primary"
          >
            {deal.organization.name}
          </Link>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        {deal.contact ? (
          <Link
            href={`/contacts/${deal.contact.id}`}
            className="text-gray-900 hover:text-primary"
          >
            {deal.contact.name}
          </Link>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-right font-medium">
        {formatCurrency(deal.value, deal.currency)}
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        {formatDate(deal.expectedCloseDate)}
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <DealStageSelect dealId={deal.id} currentStageId={deal.stage.id} />
      </td>
      <td className="whitespace-nowrap px-6 py-4">
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
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
        {formatDistanceToNow(new Date(deal.createdAt), {
          addSuffix: true,
          locale: ptBR,
        })}
      </td>
    </tr>
    );
  };

  const renderCards = (dealsToRender: Deal[]) => (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {dealsToRender.length > 0 ? (
        dealsToRender.map((deal) => <DealCard key={deal.id} deal={deal} isAdmin={isAdmin} currentUserId={currentUserId} sharedWith={sharedUsersMap[deal.id] || []} />)
      ) : (
        <div className="col-span-full py-12 text-center text-gray-500">
          Nenhum negócio encontrado
        </div>
      )}
    </div>
  );

  const renderTable = (dealsToRender: Deal[]) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Título
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Organização
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Contato
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Valor
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Data Esperada
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Estágio
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Criado
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {dealsToRender.length > 0 ? (
            dealsToRender.map(renderDealRow)
          ) : (
            <tr>
              <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                Nenhum negócio encontrado
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // Render grouped view
  if (groupedDeals) {
    return (
      <div className="space-y-6">
        {/* Currency Selector */}
        <div className="flex justify-end">
          <div className="flex items-center gap-2">
            <label htmlFor="currency-select" className="text-sm font-medium text-gray-700">
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

        {/* Groups */}
        {Object.entries(groupedDeals).map(([groupKey, group]) => {
          // Determine group label
          let groupLabel = groupKey;
          if (groupBy === "stage") {
            const firstDeal = group.deals[0];
            groupLabel = `${firstDeal.stage.pipeline.name} - ${firstDeal.stage.name}`;
          } else if (groupBy === "value") {
            const labels: { [key: string]: string } = {
              "0-10k": "Até R$ 10.000",
              "10k-50k": "R$ 10.000 - R$ 50.000",
              "50k-100k": "R$ 50.000 - R$ 100.000",
              "100k+": "Acima de R$ 100.000",
            };
            groupLabel = labels[groupKey] || groupKey;
          } else if (groupBy === "status") {
            const labels: { [key: string]: string } = {
              open: "Aberto",
              won: "Ganho",
              lost: "Perdido",
            };
            groupLabel = labels[groupKey] || groupKey;
          }

          return (
            <div key={groupKey} className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">{groupLabel}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>
                      <span className="font-medium">{group.deals.length}</span> negócio
                      {group.deals.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="font-medium text-primary">
                      {formatCurrency(group.total, displayCurrency)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {displayMode === "cards" ? renderCards(group.deals) : renderTable(group.deals)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Render ungrouped view with stats
  const totalValue = calculateTotalInCurrency(deals, displayCurrency);
  const avgValue = deals.length > 0 ? totalValue / deals.length : 0;
  const openDeals = deals.filter(d => d.status === "open").length;
  const wonDeals = deals.filter(d => d.status === "won").length;
  const lostDeals = deals.filter(d => d.status === "lost").length;

  // Group by stage for stats
  const stageStats: { [key: string]: { name: string; count: number; total: number; pipeline: string } } = {};
  deals.forEach((deal) => {
    const key = deal.stage.id;
    if (!stageStats[key]) {
      stageStats[key] = {
        name: deal.stage.name,
        pipeline: deal.stage.pipeline.name,
        count: 0,
        total: 0,
      };
    }
    stageStats[key].count++;
    stageStats[key].total = calculateTotalInCurrency(
      deals.filter(d => d.stage.id === key),
      displayCurrency
    );
  });

  return (
    <div className="space-y-6">
      {/* Currency Selector */}
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          <label htmlFor="currency-select-ungrouped" className="text-sm font-medium text-gray-700">
            Moeda do Total:
          </label>
          <select
            id="currency-select-ungrouped"
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total de Negócios</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{deals.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Valor Total</p>
          <p className="mt-1 text-2xl font-semibold text-primary">
            {formatCurrency(totalValue, displayCurrency)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Ticket Médio</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {formatCurrency(avgValue, displayCurrency)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Status</p>
          <div className="mt-1 flex items-center gap-3 text-sm">
            <span className="text-blue-600">
              <span className="font-semibold">{openDeals}</span> aberto{openDeals !== 1 ? "s" : ""}
            </span>
            <span className="text-green-600">
              <span className="font-semibold">{wonDeals}</span> ganho{wonDeals !== 1 ? "s" : ""}
            </span>
            <span className="text-red-600">
              <span className="font-semibold">{lostDeals}</span> perdido{lostDeals !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Stage Stats Card */}
      {Object.keys(stageStats).length > 0 && (
        <div className="rounded-lg border border-primary/30 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Totais por Estágio</h3>
            <span className="text-xs text-gray-500">{Object.keys(stageStats).length} estágio{Object.keys(stageStats).length !== 1 ? "s" : ""}</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Object.entries(stageStats)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([stageId, stats]) => (
              <div
                key={stageId}
                className="group relative overflow-hidden rounded-lg border-2 border-primary/20 bg-gradient-to-br from-[#2d1b3d] to-[#1a0022] p-4 shadow-sm transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/20"
              >
                {/* Pipeline Badge */}
                <div className="mb-2">
                  <span className="inline-block rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                    {stats.pipeline}
                  </span>
                </div>

                {/* Stage Name */}
                <h4 className="text-base font-bold text-gray-100 mb-3 group-hover:text-primary transition-colors">
                  {stats.name}
                </h4>

                {/* Stats */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Negócios</span>
                    <span className="text-lg font-bold text-gray-100">{stats.count}</span>
                  </div>
                  <div className="h-px bg-primary/30"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total</span>
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(stats.total, displayCurrency)}
                    </span>
                  </div>
                </div>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gradient-to-br from-primary/5 to-transparent"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deals Display */}
      {displayMode === "cards" ? (
        renderCards(deals)
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          {renderTable(deals)}
        </div>
      )}

      {/* Schedule Activity Modal */}
      {showScheduleModal && availableData && selectedDeal && (
        <ScheduleNextActivityModal
          isOpen={showScheduleModal}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedDeal(null);
          }}
          previousActivity={{
            dealId: selectedDeal.id,
            dealTitle: selectedDeal.title,
            contactId: selectedDeal.contact?.id || null,
            contactName: selectedDeal.contact?.name,
          }}
          availableData={availableData}
        />
      )}
    </div>
  );
}
