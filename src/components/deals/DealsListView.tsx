"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DealStageSelect } from "./DealStageSelect";
import { DealStatusSelect } from "./DealStatusSelect";

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
}

interface DealsListViewProps {
  deals: Deal[];
  groupBy: string;
}

type GroupedDeals = {
  [key: string]: {
    deals: Deal[];
    total: number;
  };
};

export function DealsListView({ deals, groupBy }: DealsListViewProps) {
  // Grouping logic
  const groupedDeals: GroupedDeals | null = (() => {
    if (groupBy === "none") return null;

    const groups: GroupedDeals = {};

    deals.forEach((deal) => {
      let key: string;
      let label: string;

      switch (groupBy) {
        case "stage":
          key = deal.stage.id;
          label = `${deal.stage.pipeline.name} - ${deal.stage.name}`;
          break;
        case "value":
          // Group by value ranges
          const value = deal.value;
          if (value < 10000) {
            key = "0-10k";
            label = "Até R$ 10.000";
          } else if (value < 50000) {
            key = "10k-50k";
            label = "R$ 10.000 - R$ 50.000";
          } else if (value < 100000) {
            key = "50k-100k";
            label = "R$ 50.000 - R$ 100.000";
          } else {
            key = "100k+";
            label = "Acima de R$ 100.000";
          }
          break;
        case "status":
          key = deal.status;
          label = deal.status === "open" ? "Aberto" : deal.status === "won" ? "Ganho" : "Perdido";
          break;
        default:
          key = "other";
          label = "Outros";
      }

      if (!groups[key]) {
        groups[key] = { deals: [], total: 0 };
      }

      groups[key].deals.push(deal);
      groups[key].total += deal.value;
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

  const renderDealRow = (deal: Deal) => (
    <tr key={deal.id} className="hover:bg-gray-50">
      <td className="whitespace-nowrap px-6 py-4">
        <Link
          href={`/deals/${deal.id}`}
          className="text-primary hover:text-purple-700 font-medium"
        >
          {deal.title}
        </Link>
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
                      {formatCurrency(group.total, group.deals[0].currency)}
                    </span>
                  </div>
                </div>
              </div>
              {renderTable(group.deals)}
            </div>
          );
        })}
      </div>
    );
  }

  // Render ungrouped view
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {renderTable(deals)}
    </div>
  );
}
