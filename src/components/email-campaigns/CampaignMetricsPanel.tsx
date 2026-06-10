"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";
import {
  Send, Eye, MousePointerClick, UserX, AlertTriangle, Users,
  TrendingUp, TrendingDown, Link, ChevronDown, ChevronUp,
  Search, Flame, Snowflake, Trophy, Zap,
} from "lucide-react";
import type { RecipientProgress } from "./CampaignProgressPanel";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CampaignMetrics {
  campaignId: string;
  name: string;
  status: string;
  recipients: {
    total: number;
    pending: number;
    active: number;
    completed: number;
    unsubscribed: number;
    bounced: number;
  };
  totals: {
    sent: number;
    uniqueOpened: number;
    uniqueClicked: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    unsubscribeRate: number;
  };
  steps: {
    order: number;
    subject: string;
    sent: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
  }[];
  bySegment: { segment: string; total: number }[];
  byRole: { role: string; total: number }[];
  byRecipientType: { type: string; total: number }[];
}

// ── Paleta ────────────────────────────────────────────────────────────────────

const COLORS = ["#792990", "#a855f7", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444"];

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon, color = "purple", rate,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
  color?: "purple" | "blue" | "green" | "yellow" | "red";
  rate?: number;
}) {
  const colorMap: Record<string, string> = {
    purple: "text-purple-400 bg-purple-500/10",
    blue:   "text-blue-400 bg-blue-500/10",
    green:  "text-green-400 bg-green-500/10",
    yellow: "text-yellow-400 bg-yellow-500/10",
    red:    "text-red-400 bg-red-500/10",
  };
  const textColor = colorMap[color].split(" ")[0];

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
        <span className={`p-1.5 rounded-lg ${colorMap[color]}`}>{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
      {rate !== undefined && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          {rate >= 20 ? <TrendingUp size={12} className="text-green-400" /> : <TrendingDown size={12} className="text-red-400" />}
          <span>{rate}% taxa</span>
        </div>
      )}
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

// ── Funnel visual ─────────────────────────────────────────────────────────────

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-xs text-gray-400 text-right shrink-0">{label}</div>
      <div className="flex-1 bg-gray-700/50 rounded-full h-5 overflow-hidden">
        <div
          className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
          style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: color }}
        >
          <span className="text-white text-xs font-semibold">{value}</span>
        </div>
      </div>
      <div className="w-10 text-xs text-gray-500 shrink-0">{pct}%</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CampaignMetricsPanel({ metrics, recipientEngagement = [] }: { metrics: CampaignMetrics; recipients?: RecipientProgress[]; recipientEngagement?: RecipientProgress[] }) {
  const { recipients, totals, steps, bySegment, byRole, byRecipientType } = metrics;

  const [engagementOpen, setEngagementOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Highlights computations ───────────────────────────────────────────────

  const highlights = useMemo(() => {
    const topOpeners = [...recipientEngagement]
      .filter((r) => (r.openCount ?? 0) > 0)
      .sort((a, b) => (b.openCount ?? 0) - (a.openCount ?? 0))
      .slice(0, 5);

    const urlClickMap: Record<string, { count: number; clickers: string[] }> = {};
    for (const r of recipientEngagement) {
      for (const [url, count] of Object.entries(r.clickData ?? {})) {
        if (!urlClickMap[url]) urlClickMap[url] = { count: 0, clickers: [] };
        urlClickMap[url].count += count;
        const label = r.name ?? r.email ?? "";
        if (label && !urlClickMap[url].clickers.includes(label))
          urlClickMap[url].clickers.push(label);
      }
    }
    const topUrls = Object.entries(urlClickMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    const hotLeads = recipientEngagement.filter((r) => r.openedAt && r.clickedAt);
    const coldLeads = recipientEngagement.filter((r) => !r.openedAt);
    const cto = totals.uniqueOpened > 0
      ? Math.round((totals.uniqueClicked / totals.uniqueOpened) * 100)
      : 0;
    const bestStep = steps.length > 0
      ? steps.reduce((a, b) => (b.openRate > a.openRate ? b : a))
      : null;

    return { topOpeners, topUrls, hotLeads, coldLeads, cto, bestStep };
  }, [recipientEngagement, totals, steps]);

  // ── Filtered engagement list (most engaged first) ─────────────────────────

  const filteredEngagement = useMemo(() => {
    const totalClicks = (r: RecipientProgress) =>
      Object.values(r.clickData ?? {}).reduce((a, b) => a + b, 0);
    const sorted = [...recipientEngagement].sort((a, b) => {
      const clickDiff = totalClicks(b) - totalClicks(a);
      if (clickDiff !== 0) return clickDiff;
      return (b.openCount ?? 0) - (a.openCount ?? 0);
    });
    const q = searchQuery.toLowerCase().trim();
    if (!q) return sorted;
    return sorted.filter(
      (r) =>
        (r.name ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.company ?? "").toLowerCase().includes(q),
    );
  }, [recipientEngagement, searchQuery]);

  // ── Charts data ───────────────────────────────────────────────────────────

  const statusPieData = [
    { name: "Concluídos", value: recipients.completed },
    { name: "Ativos", value: recipients.active },
    { name: "Pendentes", value: recipients.pending },
    { name: "Descadastros", value: recipients.unsubscribed },
    { name: "Bounces", value: recipients.bounced },
  ].filter((d) => d.value > 0);

  const stepChartData = steps.map((s) => ({
    name: `#${s.order + 1}`,
    subject: s.subject.length > 30 ? s.subject.slice(0, 30) + "…" : s.subject,
    Enviados: s.sent,
    Abertos: s.opened,
    Cliques: s.clicked,
  }));

  return (
    <div className="space-y-6">

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total de Contactos" value={recipients.total} icon={<Users size={16} />} color="purple" />
        <KpiCard label="Emails Enviados" value={totals.sent} icon={<Send size={16} />} color="blue" />
        <KpiCard label="Abriram" value={totals.uniqueOpened} icon={<Eye size={16} />} color="green" rate={totals.openRate} />
        <KpiCard label="Clicaram" value={totals.uniqueClicked} icon={<MousePointerClick size={16} />} color="yellow" rate={totals.clickRate} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Concluídos" value={recipients.completed} icon={<Users size={16} />} color="green"
          sub={`${recipients.total > 0 ? Math.round((recipients.completed / recipients.total) * 100) : 0}% da lista`} />
        <KpiCard label="Descadastros" value={recipients.unsubscribed} icon={<UserX size={16} />} color="yellow"
          sub={`${totals.unsubscribeRate}% da lista`} />
        <KpiCard label="Bounces" value={recipients.bounced} icon={<AlertTriangle size={16} />} color="red"
          sub={`${totals.bounceRate}% da lista`} />
        <KpiCard label="Taxa de Abertura" value={`${totals.openRate}%`} icon={<TrendingUp size={16} />} color="purple"
          sub={`${totals.clickRate}% clicaram`} />
      </div>

      {/* ── Funil de Engajamento ──────────────────────────────────────────── */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Funil de Engajamento</h3>
        <div className="space-y-3">
          <FunnelBar label="Lista total" value={recipients.total} max={recipients.total} color="#792990" />
          <FunnelBar label="Enviados" value={totals.sent} max={recipients.total} color="#3b82f6" />
          <FunnelBar label="Abriram" value={totals.uniqueOpened} max={recipients.total} color="#22c55e" />
          <FunnelBar label="Clicaram" value={totals.uniqueClicked} max={recipients.total} color="#f59e0b" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Gráfico por passo ─────────────────────────────────────────────── */}
        {stepChartData.length > 0 && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">Performance por Passo</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stepChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#e5e7eb" }}
                  formatter={(value: number | undefined, name: string | undefined, entry: Payload<number, string>) =>
                    [`${value ?? 0} — ${(entry.payload as { subject?: string })?.subject ?? ""}`, name ?? ""]
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                <Bar dataKey="Enviados" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Abertos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Cliques" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Distribuição de status ────────────────────────────────────────── */}
        {statusPieData.length > 0 && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">Distribuição de Status</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={3} dataKey="value" label={({ percent }: { percent?: number }) => `${Math.round((percent ?? 0) * 100)}%`}
                  labelLine={false}>
                  {statusPieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#e5e7eb" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Tabela de passos ──────────────────────────────────────────────── */}
      {steps.length > 0 && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Detalhe por Passo</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-700">
                  <th className="text-left pb-2 pr-4">#</th>
                  <th className="text-left pb-2 pr-4">Assunto</th>
                  <th className="text-right pb-2 pr-4">Enviados</th>
                  <th className="text-right pb-2 pr-4">Abertos</th>
                  <th className="text-right pb-2 pr-4">Taxa Abertura</th>
                  <th className="text-right pb-2 pr-4">Cliques</th>
                  <th className="text-right pb-2">Taxa Clique</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {steps.map((s) => (
                  <tr key={s.order} className="text-gray-300">
                    <td className="py-2.5 pr-4 text-gray-500">{s.order + 1}</td>
                    <td className="py-2.5 pr-4 max-w-[200px] truncate text-white">{s.subject}</td>
                    <td className="py-2.5 pr-4 text-right">{s.sent}</td>
                    <td className="py-2.5 pr-4 text-right text-green-400">{s.opened}</td>
                    <td className="py-2.5 pr-4 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.openRate >= 30 ? "bg-green-500/20 text-green-400" :
                        s.openRate >= 15 ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-red-500/20 text-red-400"
                      }`}>{s.openRate}%</span>
                    </td>
                    <td className="py-2.5 pr-4 text-right text-yellow-400">{s.clicked}</td>
                    <td className="py-2.5 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.clickRate >= 5 ? "bg-green-500/20 text-green-400" :
                        s.clickRate >= 2 ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-gray-500/20 text-gray-400"
                      }`}>{s.clickRate}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Destaques da Campanha ─────────────────────────────────────────── */}
      {recipientEngagement.length > 0 && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-yellow-400" />
            <h3 className="text-white font-semibold">Destaques da Campanha</h3>
          </div>

          {/* Resumo rápido: quentes / frios / CTO */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-orange-400">
                <Flame size={14} />
                <span className="text-xs uppercase tracking-wide">Leads Quentes</span>
              </div>
              <div className="text-2xl font-bold text-orange-400">{highlights.hotLeads.length}</div>
              <div className="text-xs text-gray-500">abriram e clicaram</div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-blue-400">
                <Snowflake size={14} />
                <span className="text-xs uppercase tracking-wide">Leads Frios</span>
              </div>
              <div className="text-2xl font-bold text-blue-400">{highlights.coldLeads.length}</div>
              <div className="text-xs text-gray-500">nunca abriram</div>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-purple-400">
                <Zap size={14} />
                <span className="text-xs uppercase tracking-wide">Click-to-Open</span>
              </div>
              <div className="text-2xl font-bold text-purple-400">{highlights.cto}%</div>
              <div className="text-xs text-gray-500">
                {highlights.cto >= 20 ? "engajamento alto" : highlights.cto >= 10 ? "engajamento médio" : "engajamento baixo"}
              </div>
            </div>
            {highlights.bestStep && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-green-400">
                  <TrendingUp size={14} />
                  <span className="text-xs uppercase tracking-wide">Melhor Passo</span>
                </div>
                <div className="text-2xl font-bold text-green-400">#{highlights.bestStep.order + 1}</div>
                <div className="text-xs text-gray-500 truncate" title={highlights.bestStep.subject}>
                  {highlights.bestStep.openRate}% abertura
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Top abridores */}
            {highlights.topOpeners.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-1.5">
                  <Eye size={14} className="text-green-400" /> Top Abridores
                </h4>
                <div className="space-y-2">
                  {highlights.topOpeners.map((r, i) => (
                    <div key={r.id} className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-500 w-4 shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-white truncate">{r.name ?? r.email}</div>
                          {r.name && <div className="text-xs text-gray-500 truncate">{r.company ?? r.email}</div>}
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          <div
                            className="h-2 rounded-full bg-green-500/70"
                            style={{ width: `${Math.max(8, Math.round(((r.openCount ?? 0) / (highlights.topOpeners[0]?.openCount ?? 1)) * 64))}px` }}
                          />
                          <span className="text-xs font-semibold text-green-400 w-8 text-right">{r.openCount}×</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pl-7">
                        {Object.entries(r.clickData ?? {}).length > 0 ? (
                          Object.entries(r.clickData).map(([url, count]) => {
                            let display = url;
                            try { display = new URL(url).hostname.replace(/^www\./, "") + new URL(url).pathname; } catch { /* keep url */ }
                            return (
                              <span key={url} className="flex items-center gap-1 text-xs bg-gray-700/60 text-gray-300 px-1.5 py-0.5 rounded-full">
                                <Link size={10} className="text-yellow-400 shrink-0" />
                                <span className="truncate max-w-[160px]" title={url}>{display}</span>
                                <span className="text-yellow-400 font-semibold">{count}×</span>
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-gray-600">sem cliques</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top links clicados */}
            {highlights.topUrls.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-1.5">
                  <Link size={14} className="text-yellow-400" /> Links Mais Clicados
                </h4>
                <div className="space-y-3">
                  {highlights.topUrls.map(([url, data]) => {
                    let display = url;
                    try { display = new URL(url).hostname.replace(/^www\./, "") + new URL(url).pathname; } catch { /* keep url */ }
                    return (
                      <div key={url}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-300 truncate flex-1" title={url}>{display}</span>
                          <span className="text-xs font-bold text-yellow-400 shrink-0">{data.count}×</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {data.clickers.slice(0, 4).map((name) => (
                            <span key={name} className="text-xs bg-gray-700/60 text-gray-400 px-1.5 py-0.5 rounded-full truncate max-w-[120px]">
                              {name}
                            </span>
                          ))}
                          {data.clickers.length > 4 && (
                            <span className="text-xs text-gray-500">+{data.clickers.length - 4}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Análise gerencial */}
          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Análise da Campanha</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-400">
              {highlights.hotLeads.length > 0 && (
                <div className="flex gap-2 bg-orange-500/5 border border-orange-500/20 rounded-lg px-3 py-2">
                  <span className="text-orange-400 shrink-0">→</span>
                  <span>
                    <strong className="text-orange-300">{highlights.hotLeads.length} leads quentes</strong> abriram e clicaram — priorize o follow-up comercial com eles agora.
                  </span>
                </div>
              )}
              {highlights.coldLeads.length > 0 && (
                <div className="flex gap-2 bg-blue-500/5 border border-blue-500/20 rounded-lg px-3 py-2">
                  <span className="text-blue-400 shrink-0">→</span>
                  <span>
                    <strong className="text-blue-300">{highlights.coldLeads.length} leads</strong> nunca abriram — considere um assunto diferente ou remova da lista.
                  </span>
                </div>
              )}
              {highlights.cto > 0 && (
                <div className="flex gap-2 bg-purple-500/5 border border-purple-500/20 rounded-lg px-3 py-2">
                  <span className="text-purple-400 shrink-0">→</span>
                  <span>
                    Click-to-open de <strong className="text-purple-300">{highlights.cto}%</strong> —{" "}
                    {highlights.cto >= 20
                      ? "conteúdo altamente relevante para quem abriu."
                      : highlights.cto >= 10
                      ? "conteúdo relevante, mas o CTA pode ser melhorado."
                      : "o conteúdo não está convertendo quem abre — revise o CTA."}
                  </span>
                </div>
              )}
              {highlights.bestStep && steps.length > 1 && (
                <div className="flex gap-2 bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-2">
                  <span className="text-green-400 shrink-0">→</span>
                  <span>
                    O <strong className="text-green-300">passo #{highlights.bestStep.order + 1}</strong> teve melhor abertura ({highlights.bestStep.openRate}%) — use esse assunto como referência para próximas campanhas.
                  </span>
                </div>
              )}
              {totals.bounceRate > 5 && (
                <div className="flex gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                  <span className="text-red-400 shrink-0">→</span>
                  <span>
                    <strong className="text-red-300">Bounce rate de {totals.bounceRate}%</strong> está acima do ideal — limpe a lista e remova endereços inválidos.
                  </span>
                </div>
              )}
              {totals.unsubscribeRate > 1 && (
                <div className="flex gap-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2">
                  <span className="text-yellow-400 shrink-0">→</span>
                  <span>
                    <strong className="text-yellow-300">{totals.unsubscribeRate}% descadastraram</strong> — avalie se a lista está bem segmentada para essa mensagem.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Engajamento por Lead (colapsável) ────────────────────────────── */}
      {recipientEngagement.length > 0 && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden">
          {/* Header clicável */}
          <button
            type="button"
            onClick={() => setEngagementOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-700/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Users size={16} className="text-purple-400" />
              <span className="text-white font-semibold">Engajamento por Lead</span>
              <span className="text-xs text-gray-500 ml-1">({recipientEngagement.length})</span>
            </div>
            {engagementOpen
              ? <ChevronUp size={16} className="text-gray-400" />
              : <ChevronDown size={16} className="text-gray-400" />}
          </button>

          {/* Conteúdo colapsável */}
          {engagementOpen && (
            <div className="px-5 pb-5 border-t border-gray-700">
              {/* Busca */}
              <div className="relative my-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por nome, email ou empresa…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    ×
                  </button>
                )}
              </div>

              {filteredEngagement.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">Nenhum resultado para "{searchQuery}"</div>
              ) : (
                <div className="divide-y divide-gray-700/50">
                  {filteredEngagement.map((r) => (
                    <div key={r.id} className="py-3 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <span className="text-sm text-white font-medium">{r.name ?? r.email}</span>
                          {r.name && <span className="text-xs text-gray-400 ml-2">{r.email}</span>}
                          {r.company && <span className="text-xs text-gray-500 ml-2">· {r.company}</span>}
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-xs">
                          {r.openedAt ? (
                            <span className="flex items-center gap-1 text-green-400 font-medium">
                              <Eye size={12} />
                              {(r.openCount ?? 0) > 0 ? `${r.openCount}×` : "Abriu"}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-gray-600">
                              <Eye size={12} /> Não abriu
                            </span>
                          )}
                          {r.clickedAt ? (
                            <span className="flex items-center gap-1 text-yellow-400 font-medium">
                              <MousePointerClick size={12} />
                              {Object.values(r.clickData ?? {}).reduce((a, b) => a + b, 0) || 1}×
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-gray-600">
                              <MousePointerClick size={12} /> Não clicou
                            </span>
                          )}
                        </div>
                      </div>
                      {Object.entries(r.clickData ?? {}).length > 0 && (
                        <div className="flex flex-wrap gap-2 pl-1">
                          {Object.entries(r.clickData).map(([url, count]) => {
                            let display = url;
                            try { display = new URL(url).hostname.replace(/^www\./, "") + new URL(url).pathname; } catch { /* keep url */ }
                            return (
                              <span key={url} className="flex items-center gap-1 text-xs bg-gray-700/60 text-gray-300 px-2 py-0.5 rounded-full">
                                <Link size={10} className="text-yellow-400 shrink-0" />
                                <span className="truncate max-w-[180px]" title={url}>{display}</span>
                                <span className="text-yellow-400 font-semibold ml-1">{count}×</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

        {/* ── Por segmento ──────────────────────────────────────────────────── */}
        {bySegment.length > 0 && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-3 text-sm">Por Segmento / Setor</h3>
            <div className="space-y-2">
              {bySegment.slice(0, 8).map((s) => (
                <div key={s.segment} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-300 truncate">{s.segment}</span>
                  <span className="text-xs font-medium text-purple-400 shrink-0">{s.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Por cargo ─────────────────────────────────────────────────────── */}
        {byRole.length > 0 && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-3 text-sm">Por Cargo</h3>
            <div className="space-y-2">
              {byRole.slice(0, 8).map((r) => (
                <div key={r.role} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-300 truncate">{r.role}</span>
                  <span className="text-xs font-medium text-blue-400 shrink-0">{r.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Por tipo de destinatário ───────────────────────────────────────── */}
        {byRecipientType.length > 0 && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-3 text-sm">Tipo de Destinatário</h3>
            <div className="space-y-2">
              {byRecipientType.map((r) => (
                <div key={r.type} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-300">{r.type === "LEAD" ? "Lead" : "Contacto"}</span>
                  <span className="text-xs font-medium text-green-400">{r.total}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500">
              <p>Métricas por país/cidade disponíveis numa próxima versão (requer rastreamento de IP na abertura).</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
