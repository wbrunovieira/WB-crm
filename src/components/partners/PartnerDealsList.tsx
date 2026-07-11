import Link from "next/link";
import { TrendingUp, Plus, Trophy, ExternalLink, Layers } from "lucide-react";

export interface PartnerDealItem {
  id: string;
  title: string;
  value: number;
  currency: string;
  status: string;
  stage: { id: string; name: string; pipeline?: { id: string; name: string } } | null;
  contact: { id: string; name: string } | null;
  _count: { activities: number };
  /** How the partner relates to this deal: its customer, its referrer, or both. */
  roles: Array<"customer" | "referred">;
}

const statusLabel: Record<string, { label: string; cls: string }> = {
  open: { label: "Aberto", cls: "bg-blue-900/40 text-blue-300 border-blue-700/40" },
  won: { label: "Ganho", cls: "bg-green-900/40 text-green-300 border-green-700/40" },
  lost: { label: "Perdido", cls: "bg-red-900/40 text-red-300 border-red-700/40" },
};

const roleBadge: Record<"customer" | "referred", { label: string; cls: string }> = {
  customer: { label: "Cliente", cls: "bg-purple-900/50 text-purple-200 border-purple-600/50" },
  referred: { label: "Indicação", cls: "bg-amber-900/40 text-amber-200 border-amber-600/50" },
};

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL" }).format(value);

/**
 * Partner deals timeline — a single list mixing deals where the partner is the
 * customer (partnerId) and deals it referred (referredByPartnerId), each row tagged
 * with a Cliente/Indicação badge. Read-only; editing happens on the deal page.
 */
export function PartnerDealsList({ deals, partnerId }: { deals: PartnerDealItem[]; partnerId: string }) {
  return (
    <div id="negocios" className="scroll-mt-52 rounded-xl border border-purple-900/40 bg-[#120019] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex w-full items-center gap-2 border-b border-purple-900/40 pb-3 text-xs font-bold uppercase tracking-wider text-purple-400">
          <TrendingUp size={14} />
          Negócios
          <span className="ml-1 rounded-full bg-purple-900/40 px-2 py-0.5 text-xs font-semibold text-purple-300">
            {deals.length}
          </span>
          <Link
            href={`/deals/new?partnerId=${partnerId}&returnTo=/partners/${partnerId}`}
            className="ml-auto flex items-center gap-1 rounded-lg bg-purple-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-600"
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
                className="flex items-center justify-between rounded-lg border border-purple-900/30 bg-purple-950/30 px-4 py-3 transition-colors hover:bg-purple-900/20"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {deal.status === "won" && <Trophy size={13} className="flex-shrink-0 text-green-400" />}
                    <Link
                      href={`/deals/${deal.id}`}
                      className="truncate text-sm font-semibold text-gray-100 transition-colors hover:text-purple-300"
                    >
                      {deal.title}
                    </Link>
                    {deal.roles.map((role) => (
                      <span key={role} className={`rounded-full border px-2 py-0.5 text-xs ${roleBadge[role].cls}`}>
                        {roleBadge[role].label}
                      </span>
                    ))}
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    {deal.stage && (
                      <span className="flex items-center gap-1">
                        <Layers size={10} />
                        {deal.stage.pipeline?.name} › {deal.stage.name}
                      </span>
                    )}
                    <span>
                      {deal._count.activities} atividade{deal._count.activities !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="ml-4 flex flex-shrink-0 items-center gap-2">
                  <span className="text-sm font-bold text-purple-300">{formatCurrency(deal.value, deal.currency)}</span>
                  <Link
                    href={`/deals/${deal.id}`}
                    className="rounded p-1 text-gray-500 transition-colors hover:text-purple-300"
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
