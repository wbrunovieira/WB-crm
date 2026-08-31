import Link from "next/link";
import type { DealsForecast } from "@/types/admin-manager";

interface ForecastDealsListProps {
  forecast: DealsForecast;
}

const formatCurrency = (value: number, currency = "BRL") =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);

// expectedCloseDate carries date-only semantics (stored at midnight), so it is read as a
// UTC calendar day — rendering it in local time would shift it a day back in Brazil.
const formatExpected = (expectedCloseDate: string | null) =>
  expectedCloseDate
    ? new Date(expectedCloseDate).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        timeZone: "UTC",
      })
    : "—";

/**
 * Pipeline that falls outside the period. Shown in both the populated and the empty state:
 * an in-period list alone would silently hide an overdue deal (a closing opportunity) and
 * the deals carrying no forecast date at all (unplanned revenue).
 */
function ForecastNotes({ forecast }: ForecastDealsListProps) {
  const { overdue, withoutDate } = forecast;
  if (overdue.count === 0 && withoutDate.count === 0) return null;

  return (
    <p
      data-testid="forecast-notes"
      className="text-xs text-gray-400 pt-3 border-t border-[#792990]/20"
    >
      {overdue.count > 0 && (
        <span className="text-amber-400">
          {overdue.count} {overdue.count === 1 ? "atrasado" : "atrasados"} (
          {formatCurrency(overdue.value)})
        </span>
      )}
      {overdue.count > 0 && withoutDate.count > 0 && <span> · </span>}
      {withoutDate.count > 0 && (
        <span>
          {withoutDate.count} sem data prevista ({formatCurrency(withoutDate.value)})
        </span>
      )}
    </p>
  );
}

export function ForecastDealsList({ forecast }: ForecastDealsListProps) {
  if (forecast.deals.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-gray-500 text-sm py-6 text-center">
          Nenhum negócio previsto para o período
        </p>
        <ForecastNotes forecast={forecast} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-[#792990]/30">
              <th className="pb-2 font-medium">Negócio</th>
              <th className="pb-2 font-medium whitespace-nowrap">Etapa</th>
              <th className="pb-2 font-medium whitespace-nowrap">Previsto</th>
              <th className="pb-2 font-medium text-right whitespace-nowrap">Valor</th>
            </tr>
          </thead>
          <tbody>
            {forecast.deals.map((deal) => (
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
                  {deal.stageName ?? "—"}
                </td>
                <td className="py-2 pr-4 text-gray-400 whitespace-nowrap">
                  {formatExpected(deal.expectedCloseDate)}
                </td>
                <td className="py-2 text-right text-[#b366cc] font-semibold whitespace-nowrap">
                  {formatCurrency(deal.value, deal.currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-[#792990]/30">
              <td className="pt-2 text-gray-400 font-medium" colSpan={3}>
                Total previsto ({forecast.deals.length})
              </td>
              <td className="pt-2 text-right text-white font-semibold whitespace-nowrap">
                {formatCurrency(forecast.totalValue)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <ForecastNotes forecast={forecast} />
    </div>
  );
}
