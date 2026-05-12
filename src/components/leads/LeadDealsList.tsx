"use client";

import Link from "next/link";
import { TrendingUp, Plus, Trophy, ExternalLink, Tag, Layers } from "lucide-react";

interface DealItem {
  id: string;
  title: string;
  value: number;
  currency: string;
  status: string;
  stage: { id: string; name: string; pipeline?: { id: string; name: string } } | null;
  contact: { id: string; name: string } | null;
  _count: { activities: number };
}

interface Props {
  deals: DealItem[];
  leadId: string;
  leadName: string;
}

const statusLabel: Record<string, { label: string; cls: string }> = {
  open:  { label: "Aberto", cls: "bg-blue-900/40 text-blue-300 border-blue-700/40" },
  won:   { label: "Ganho",  cls: "bg-green-900/40 text-green-300 border-green-700/40" },
  lost:  { label: "Perdido",cls: "bg-red-900/40 text-red-300 border-red-700/40" },
};

export function LeadDealsList({ deals, leadId }: Props) {
  const formatCurrency = (value: number, currency: string) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL" }).format(value);

  return (
    <div className="rounded-xl border border-purple-900/40 bg-[#120019] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400 border-b border-purple-900/40 pb-3 w-full">
          <TrendingUp size={14} />
          Negócios
          <span className="ml-1 rounded-full bg-purple-900/40 px-2 py-0.5 text-xs font-semibold text-purple-300">
            {deals.length}
          </span>
          <Link
            href={`/deals/new?leadId=${leadId}`}
            className="ml-auto flex items-center gap-1 rounded-lg bg-purple-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-600 transition-colors"
          >
            <Plus size={12} />
            Novo Negócio
          </Link>
        </h2>
      </div>

      {deals.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">Nenhum negócio vinculado</p>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => {
            const st = statusLabel[deal.status] ?? statusLabel.open;
            return (
              <div
                key={deal.id}
                className="flex items-center justify-between rounded-lg border border-purple-900/30 bg-purple-950/30 px-4 py-3 hover:bg-purple-900/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {deal.status === "won" && <Trophy size={13} className="text-green-400 flex-shrink-0" />}
                    <Link
                      href={`/deals/${deal.id}`}
                      className="text-sm font-semibold text-gray-100 hover:text-purple-300 transition-colors truncate"
                    >
                      {deal.title}
                    </Link>
                    <span className={`text-xs border rounded-full px-2 py-0.5 ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    {deal.stage && (
                      <span className="flex items-center gap-1">
                        <Layers size={10} />
                        {deal.stage.pipeline?.name} › {deal.stage.name}
                      </span>
                    )}
                    {deal.contact && (
                      <span className="flex items-center gap-1">
                        <Tag size={10} />
                        {deal.contact.name}
                      </span>
                    )}
                    <span>{deal._count.activities} atividade{deal._count.activities !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-bold text-purple-300">
                    {formatCurrency(deal.value, deal.currency)}
                  </span>
                  <Link
                    href={`/deals/${deal.id}`}
                    className="rounded p-1 text-gray-500 hover:text-purple-300 transition-colors"
                    title="Ver negócio"
                  >
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
