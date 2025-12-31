"use client";

import type { UserMetrics } from "@/actions/admin-manager";

interface UserPerformanceTableProps {
  byUser: UserMetrics[];
}

export function UserPerformanceTable({ byUser }: UserPerformanceTableProps) {
  // Sort by leads created (most active first)
  const sortedUsers = [...byUser].sort(
    (a, b) => (b.leads.created + b.deals.created + b.activities.total) -
              (a.leads.created + a.deals.created + a.activities.total)
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (sortedUsers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nenhum usuário com atividade no período
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#792990]/30">
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Usuário</th>
            <th className="text-center py-3 px-4 text-gray-400 font-medium">Leads</th>
            <th className="text-center py-3 px-4 text-gray-400 font-medium">Conv.</th>
            <th className="text-center py-3 px-4 text-gray-400 font-medium">Orgs</th>
            <th className="text-center py-3 px-4 text-gray-400 font-medium">Negócios</th>
            <th className="text-right py-3 px-4 text-gray-400 font-medium">Valor</th>
            <th className="text-center py-3 px-4 text-gray-400 font-medium">Contatos</th>
            <th className="text-center py-3 px-4 text-gray-400 font-medium">Parceiros</th>
            <th className="text-center py-3 px-4 text-gray-400 font-medium">Atividades</th>
            <th className="text-center py-3 px-4 text-gray-400 font-medium">Etapas</th>
          </tr>
        </thead>
        <tbody>
          {sortedUsers.map((user) => (
            <tr
              key={user.userId}
              className="border-b border-[#792990]/10 hover:bg-[#792990]/10 transition-colors"
            >
              <td className="py-3 px-4">
                <div>
                  <p className="text-white font-medium">{user.userName}</p>
                  <p className="text-gray-500 text-xs">{user.userEmail}</p>
                </div>
              </td>
              <td className="text-center py-3 px-4 text-white">{user.leads.created}</td>
              <td className="text-center py-3 px-4">
                <span className="text-green-500">{user.leads.converted}</span>
                {user.leads.created > 0 && (
                  <span className="text-gray-500 text-xs ml-1">
                    ({user.leads.conversionRate}%)
                  </span>
                )}
              </td>
              <td className="text-center py-3 px-4 text-white">{user.organizations.created}</td>
              <td className="text-center py-3 px-4">
                <span className="text-white">{user.deals.created}</span>
                {user.deals.won > 0 && (
                  <span className="text-green-500 text-xs ml-1">
                    ({user.deals.won} ganhos)
                  </span>
                )}
              </td>
              <td className="text-right py-3 px-4 text-white font-medium">
                {formatCurrency(user.deals.totalValue)}
              </td>
              <td className="text-center py-3 px-4 text-white">{user.contacts.created}</td>
              <td className="text-center py-3 px-4 text-white">{user.partners.created}</td>
              <td className="text-center py-3 px-4">
                <span className="text-white">{user.activities.total}</span>
                {user.activities.overdue > 0 && (
                  <span className="text-red-500 text-xs ml-1">
                    ({user.activities.overdue} atrasadas)
                  </span>
                )}
              </td>
              <td className="text-center py-3 px-4 text-white">{user.stageChanges}</td>
            </tr>
          ))}
        </tbody>
        {/* Totals row */}
        <tfoot>
          <tr className="bg-[#792990]/20">
            <td className="py-3 px-4 text-white font-bold">TOTAL</td>
            <td className="text-center py-3 px-4 text-white font-bold">
              {sortedUsers.reduce((sum, u) => sum + u.leads.created, 0)}
            </td>
            <td className="text-center py-3 px-4 text-green-500 font-bold">
              {sortedUsers.reduce((sum, u) => sum + u.leads.converted, 0)}
            </td>
            <td className="text-center py-3 px-4 text-white font-bold">
              {sortedUsers.reduce((sum, u) => sum + u.organizations.created, 0)}
            </td>
            <td className="text-center py-3 px-4 text-white font-bold">
              {sortedUsers.reduce((sum, u) => sum + u.deals.created, 0)}
            </td>
            <td className="text-right py-3 px-4 text-white font-bold">
              {formatCurrency(sortedUsers.reduce((sum, u) => sum + u.deals.totalValue, 0))}
            </td>
            <td className="text-center py-3 px-4 text-white font-bold">
              {sortedUsers.reduce((sum, u) => sum + u.contacts.created, 0)}
            </td>
            <td className="text-center py-3 px-4 text-white font-bold">
              {sortedUsers.reduce((sum, u) => sum + u.partners.created, 0)}
            </td>
            <td className="text-center py-3 px-4 text-white font-bold">
              {sortedUsers.reduce((sum, u) => sum + u.activities.total, 0)}
            </td>
            <td className="text-center py-3 px-4 text-white font-bold">
              {sortedUsers.reduce((sum, u) => sum + u.stageChanges, 0)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
