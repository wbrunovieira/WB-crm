"use client";

import { Users, DollarSign, Activity, Building2 } from "lucide-react";
import { MetricCard } from "./MetricCard";
import type { ManagerStats } from "@/actions/admin-manager";

interface StatsOverviewProps {
  stats: ManagerStats;
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const { totals, comparison } = stats;

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Leads"
        value={totals.leads.total}
        subtitle={`${totals.leads.converted} convertidos (${totals.leads.conversionRate}%)`}
        icon={Users}
        change={comparison?.leads}
      />

      <MetricCard
        title="Negócios"
        value={formatCurrency(totals.deals.totalValue)}
        subtitle={`${totals.deals.total} negócios (${totals.deals.won} ganhos)`}
        icon={DollarSign}
        change={comparison?.dealsValue}
      />

      <MetricCard
        title="Atividades"
        value={totals.activities.total}
        subtitle={`${totals.activities.pending} pendentes, ${totals.activities.overdue} atrasadas`}
        icon={Activity}
        change={comparison?.activities}
      />

      <MetricCard
        title="Organizações"
        value={totals.organizations.total}
        subtitle={`${totals.contacts.total} contatos, ${totals.partners.total} parceiros`}
        icon={Building2}
        change={comparison?.organizations}
      />
    </div>
  );
}
