"use client";

import Link from "next/link";
import { Server, Calendar, DollarSign } from "lucide-react";

export interface HostingRenewal {
  id: string;
  name: string;
  hostingRenewalDate: Date | null;
  hostingPlan: string | null;
  hostingValue: number | null;
  hostingReminderDays: number;
  hostingNotes: string | null;
  email: string | null;
  phone: string | null;
}

interface HostingRenewalsWidgetProps {
  renewals: HostingRenewal[];
}

function getDaysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const renewalDate = new Date(date);
  renewalDate.setHours(0, 0, 0, 0);
  const diffTime = renewalDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getUrgencyColor(days: number): string {
  if (days <= 7) return "bg-red-500";
  if (days <= 15) return "bg-yellow-500";
  return "bg-green-500";
}

function formatDaysRemaining(days: number): string {
  if (days === 0) return "Hoje";
  if (days === 1) return "1 dia";
  return `${days} dias`;
}

export function HostingRenewalsWidget({ renewals }: HostingRenewalsWidgetProps) {
  // Filter out renewals without a date
  const validRenewals = renewals.filter(
    (r): r is typeof r & { hostingRenewalDate: Date } => r.hostingRenewalDate !== null
  );

  return (
    <div className="rounded-lg border border-[#792990] bg-[#1a0022] p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-full bg-purple-900/50 p-2">
          <Server className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-white">
          Vencimentos de Hospedagem
        </h2>
      </div>

      {validRenewals.length === 0 ? (
        <p className="text-gray-400 text-sm py-4 text-center">
          Nenhum vencimento próximo
        </p>
      ) : (
        <div className="space-y-3">
          {validRenewals.map((renewal) => {
            const daysUntil = getDaysUntil(renewal.hostingRenewalDate);
            const urgencyColor = getUrgencyColor(daysUntil);

            return (
              <div
                key={renewal.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-purple-900/20 hover:bg-purple-900/30 transition-colors"
              >
                {/* Urgency indicator */}
                <div
                  data-testid={`urgency-indicator-${renewal.id}`}
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${urgencyColor}`}
                />

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/organizations/${renewal.id}`}
                    className="font-medium text-white hover:text-primary transition-colors block truncate"
                  >
                    {renewal.name}
                  </Link>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                    {renewal.hostingPlan && (
                      <span>{renewal.hostingPlan}</span>
                    )}
                    {renewal.hostingValue !== null && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        R$ {renewal.hostingValue.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Date and days remaining */}
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 text-sm text-gray-300">
                    <Calendar className="h-3 w-3" />
                    {new Date(renewal.hostingRenewalDate).toLocaleDateString("pt-BR")}
                  </div>
                  <div className={`text-xs mt-1 ${
                    daysUntil <= 7 ? "text-red-400" :
                    daysUntil <= 15 ? "text-yellow-400" : "text-green-400"
                  }`}>
                    {formatDaysRemaining(daysUntil)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {validRenewals.length > 0 && (
        <div className="mt-4 pt-4 border-t border-purple-900/50">
          <Link
            href="/organizations?hasHosting=true"
            className="text-sm text-primary hover:underline"
          >
            Ver todas as organizações com hospedagem →
          </Link>
        </div>
      )}
    </div>
  );
}
