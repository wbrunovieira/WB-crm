"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";
import {
  Send, Eye, MousePointerClick, UserX, AlertTriangle, Users,
  TrendingUp, TrendingDown, Link,
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

      {/* ── Engajamento por Lead ──────────────────────────────────────────── */}
      {recipientEngagement.length > 0 && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Engajamento por Lead</h3>
          <div className="divide-y divide-gray-700/50">
            {recipientEngagement.map((r) => (
              <div key={r.id} className="py-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <span className="text-sm text-white font-medium">{r.name ?? r.email}</span>
                    {r.name && <span className="text-xs text-gray-400 ml-2">{r.email}</span>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs">
                    {r.openedAt ? (
                      <span className="flex items-center gap-1 text-green-400 font-medium">
                        <Eye size={12} />
                        {r.openCount > 0 ? `${r.openCount}x` : "Abriu"}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-600">
                        <Eye size={12} /> Não abriu
                      </span>
                    )}
                    {r.clickedAt ? (
                      <span className="flex items-center gap-1 text-yellow-400 font-medium">
                        <MousePointerClick size={12} />
                        {Object.values(r.clickData ?? {}).reduce((a, b) => a + b, 0) || 1}x
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
              <p>📍 Métricas por país/cidade disponíveis numa próxima versão (requer rastreamento de IP na abertura).</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
