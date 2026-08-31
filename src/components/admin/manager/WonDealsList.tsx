import Link from "next/link";
import type { WonDealSummary } from "@/types/admin-manager";

interface WonDealsListProps {
  wonDeals: WonDealSummary[];
}

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);

// closedAt is an instant, not a calendar date, so it is rendered in the viewer's local
// time (unlike the period header, which labels UTC calendar-day boundaries).
const formatClosedAt = (closedAt: string | null) =>
  closedAt
    ? new Date(closedAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

export function WonDealsList({ wonDeals }: WonDealsListProps) {
  if (wonDeals.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-6 text-center">
        Nenhum negócio ganho no período
      </p>
    );
  }

  // Deals are multi-currency; adding BRL to USD would produce a meaningless figure,
  // so the footer carries one total per currency present.
  const totalsByCurrency = wonDeals.reduce<Record<string, number>>((acc, deal) => {
    acc[deal.currency] = (acc[deal.currency] ?? 0) + deal.value;
    return acc;
  }, {});

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 border-b border-[#792990]/30">
            <th className="pb-2 font-medium">Negócio</th>
            <th className="pb-2 font-medium whitespace-nowrap">Fechado em</th>
            <th className="pb-2 font-medium text-right whitespace-nowrap">Valor</th>
          </tr>
        </thead>
        <tbody>
          {wonDeals.map((deal) => (
            <tr key={deal.id} className="border-b border-[#792990]/10 last:border-0">
              <td className="py-2 pr-4">
                <Link
                  href={`/deals/${deal.id}`}
                  className="text-white hover:text-[#b366cc] transition-colors"
                >
                  {deal.title}
                </Link>
              </td>
              <td className="py-2 pr-4 text-gray-400 whitespace-nowrap">
                {formatClosedAt(deal.closedAt)}
              </td>
              <td className="py-2 text-right text-green-400 font-semibold whitespace-nowrap">
                {formatCurrency(deal.value, deal.currency)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {Object.entries(totalsByCurrency).map(([currency, total], index) => (
            <tr key={currency} className={index === 0 ? "border-t border-[#792990]/30" : ""}>
              <td className="pt-2 text-gray-400 font-medium" colSpan={2}>
                {index === 0 ? `Total (${wonDeals.length})` : ""}
              </td>
              <td className="pt-2 text-right text-white font-semibold whitespace-nowrap">
                {formatCurrency(total, currency)}
              </td>
            </tr>
          ))}
        </tfoot>
      </table>
    </div>
  );
}
