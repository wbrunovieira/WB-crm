"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface RecipientProgress {
  id: string;
  email: string;
  name?: string;
  company?: string;
  status: string;
  currentStep: number;
  stepsSent: number[];
  lastSentAt?: string;
}

export interface CampaignProgressData {
  campaignId: string;
  totalRecipients: number;
  totalSteps: number;
  sendingInProgress: boolean;
  recipients: RecipientProgress[];
}

interface Props {
  campaignId: string;
  token: string;
  totalSteps: number;
}

// ── Status badge config ────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:      { label: "Pendente",      className: "bg-gray-500/20 text-gray-400" },
  ACTIVE:       { label: "Ativo",         className: "bg-blue-500/20 text-blue-400" },
  COMPLETED:    { label: "Concluído",     className: "bg-green-500/20 text-green-400" },
  UNSUBSCRIBED: { label: "Descadastrado", className: "bg-yellow-500/20 text-yellow-400" },
  BOUNCED:      { label: "Bounce",        className: "bg-red-500/20 text-red-400" },
};

function RecipientStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-gray-500/20 text-gray-400" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CampaignProgressPanel({ campaignId, token, totalSteps }: Props) {
  const [data, setData] = useState<CampaignProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProgress = async () => {
    if (!campaignId) return;
    try {
      const result = await apiFetch<CampaignProgressData>(
        `/email-campaigns/${campaignId}/progress`,
        token,
      );
      setData(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar progresso");
    }
  };

  useEffect(() => {
    if (!campaignId) return;

    void fetchProgress();

    intervalRef.current = setInterval(() => {
      void fetchProgress();
    }, 5000);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  if (!campaignId) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p>Selecione uma campanha para ver o progresso.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 text-red-400">
        <p>{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-gray-500">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Carregando progresso...</p>
      </div>
    );
  }

  const sentCount = data.recipients.filter(
    (r) => r.status === "COMPLETED" || r.stepsSent.length > 0,
  ).length;
  const progressPct = data.totalRecipients > 0
    ? Math.round((sentCount / data.totalRecipients) * 100)
    : 0;

  const steps = totalSteps > 0 ? totalSteps : data.totalSteps;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-white font-semibold text-lg">
              {sentCount} de {data.totalRecipients} enviados
            </h3>
            {data.sendingInProgress && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Enviando...
              </span>
            )}
          </div>
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Última atualização:{" "}
              {lastUpdated.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{progressPct}%</span>
            <span>{steps} passo{steps !== 1 ? "s" : ""} na sequência</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Recipients list */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-700">
          <p className="text-sm text-gray-400">
            {data.totalRecipients} destinatário{data.totalRecipients !== 1 ? "s" : ""}
          </p>
        </div>

        {data.recipients.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">Nenhum destinatário inscrito nesta campanha.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {data.recipients.map((recipient) => (
              <div key={recipient.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-700/20 transition-colors">
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white font-medium truncate">
                    {recipient.name ?? recipient.email}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {recipient.name ? recipient.email : ""}
                    {recipient.company ? (recipient.name ? ` · ${recipient.company}` : recipient.company) : ""}
                  </p>
                </div>

                {/* Step bubbles */}
                {steps > 0 && (
                  <div className="flex items-center gap-1 shrink-0">
                    {Array.from({ length: steps }, (_, i) => (
                      <span
                        key={i}
                        title={`Passo ${i + 1}`}
                        className={`w-4 h-4 rounded-full border text-[9px] flex items-center justify-center font-bold ${
                          recipient.stepsSent.includes(i)
                            ? "bg-green-500 border-green-400 text-white"
                            : "bg-gray-700 border-gray-600 text-gray-500"
                        }`}
                      >
                        {i + 1}
                      </span>
                    ))}
                  </div>
                )}

                {/* Status badge */}
                <RecipientStatusBadge status={recipient.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
