"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Mail, Plus, Play, Pause, BarChart2, Trash2, Users, ShieldOff,
  ChevronDown, ChevronUp, Send, ArrowRight, CheckCircle, Clock, XCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  description?: string;
  fromEmail: string;
  status: string;
  createdAt: string;
}

interface CampaignStep {
  order: number;
  subject: string;
  bodyHtml: string;
  delayDays: number;
}

interface CampaignStats {
  campaignId: string;
  steps: {
    stepId: string;
    order: number;
    subject: string;
    sent: number;
    opened: number;
    clicked: number;
  }[];
  recipients: { total: number; active: number; completed: number; unsubscribed: number };
}

interface Suppression {
  id: string;
  email: string;
  reason: string;
  createdAt: string;
}

interface Props {
  campaigns: Campaign[];
  suppressions: Suppression[];
}

type Tab = "campanhas" | "criar" | "suppressions";

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    DRAFT: { label: "Rascunho", className: "bg-gray-500/20 text-gray-300" },
    ACTIVE: { label: "Ativa", className: "bg-green-500/20 text-green-400" },
    PAUSED: { label: "Pausada", className: "bg-yellow-500/20 text-yellow-400" },
    FINISHED: { label: "Finalizada", className: "bg-blue-500/20 text-blue-400" },
  };
  const s = map[status] ?? { label: status, className: "bg-gray-500/20 text-gray-400" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.className}`}>{s.label}</span>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function EmailCampaignsView({ campaigns: initialCampaigns, suppressions: initialSuppressions }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";

  const [activeTab, setActiveTab] = useState<Tab>("campanhas");
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [suppressions, setSuppressions] = useState(initialSuppressions);
  const [expandedStats, setExpandedStats] = useState<Record<string, CampaignStats | null>>({});
  const [loadingStats, setLoadingStats] = useState<string | null>(null);

  // ── Create form state ──
  const [form, setForm] = useState({ name: "", description: "", fromEmail: "" });
  const [steps, setSteps] = useState<CampaignStep[]>([
    { order: 0, subject: "", bodyHtml: "", delayDays: 0 },
  ]);
  const [creating, setCreating] = useState(false);

  // ── Suppression form ──
  const [suppressEmail, setSuppressEmail] = useState("");

  // ── Helpers ──────────────────────────────────────────────────────────────

  const refreshCampaigns = async () => {
    try {
      const list = await apiFetch<Campaign[]>("/email-campaigns", token);
      setCampaigns(list);
    } catch { /* ignore */ }
  };

  const toggleStats = async (campaignId: string) => {
    if (expandedStats[campaignId] !== undefined) {
      setExpandedStats((p) => { const n = { ...p }; delete n[campaignId]; return n; });
      return;
    }
    setLoadingStats(campaignId);
    try {
      const stats = await apiFetch<CampaignStats>(`/email-campaigns/${campaignId}/stats`, token);
      setExpandedStats((p) => ({ ...p, [campaignId]: stats }));
    } catch {
      toast.error("Erro ao carregar estatísticas");
    } finally {
      setLoadingStats(null);
    }
  };

  const handleStart = async (id: string) => {
    try {
      await apiFetch(`/email-campaigns/${id}/start`, token, { method: "POST" });
      toast.success("Campanha iniciada");
      await refreshCampaigns();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar campanha");
    }
  };

  const handlePause = async (id: string) => {
    try {
      await apiFetch(`/email-campaigns/${id}/pause`, token, { method: "POST" });
      toast.success("Campanha pausada");
      await refreshCampaigns();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao pausar campanha");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover esta campanha permanentemente?")) return;
    try {
      await apiFetch(`/email-campaigns/${id}`, token, { method: "DELETE" });
      toast.success("Campanha removida");
      setCampaigns((p) => p.filter((c) => c.id !== id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover campanha");
    }
  };

  // ── Create campaign ───────────────────────────────────────────────────────

  const addStep = () => {
    setSteps((p) => [
      ...p,
      { order: p.length, subject: "", bodyHtml: "", delayDays: p.length === 0 ? 0 : 3 },
    ]);
  };

  const removeStep = (i: number) => {
    setSteps((p) => p.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx })));
  };

  const updateStep = (i: number, field: keyof CampaignStep, value: string | number) => {
    setSteps((p) => p.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.fromEmail || steps.some((s) => !s.subject || !s.bodyHtml)) {
      toast.error("Preencha nome, remetente e todos os passos");
      return;
    }
    setCreating(true);
    try {
      const campaign = await apiFetch<Campaign>("/email-campaigns", token, {
        method: "POST",
        body: JSON.stringify(form),
      });
      for (const step of steps) {
        await apiFetch(`/email-campaigns/${campaign.id}/steps`, token, {
          method: "POST",
          body: JSON.stringify(step),
        });
      }
      toast.success("Campanha criada com sucesso");
      setForm({ name: "", description: "", fromEmail: "" });
      setSteps([{ order: 0, subject: "", bodyHtml: "", delayDays: 0 }]);
      setActiveTab("campanhas");
      await refreshCampaigns();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar campanha");
    } finally {
      setCreating(false);
    }
  };

  // ── Suppression ───────────────────────────────────────────────────────────

  const handleAddSuppression = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppressEmail.trim()) return;
    try {
      await apiFetch("/email-campaigns/suppressions", token, {
        method: "POST",
        body: JSON.stringify({ email: suppressEmail.trim() }),
      });
      toast.success("Email bloqueado");
      setSuppressEmail("");
      const list = await apiFetch<Suppression[]>("/email-campaigns/suppressions", token);
      setSuppressions(list);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao bloquear email");
    }
  };

  const handleRemoveSuppression = async (email: string) => {
    try {
      await apiFetch(`/email-campaigns/suppressions/${encodeURIComponent(email)}`, token, { method: "DELETE" });
      toast.success("Desbloqueado");
      setSuppressions((p) => p.filter((s) => s.email !== email));
    } catch {
      toast.error("Erro ao remover bloqueio");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "campanhas", label: "Campanhas", icon: <Mail size={16} /> },
    { key: "criar", label: "Nova Campanha", icon: <Plus size={16} /> },
    { key: "suppressions", label: "Lista de Bloqueio", icon: <ShieldOff size={16} /> },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Mail size={28} className="text-purple-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Campanhas de Email</h1>
          <p className="text-sm text-gray-400">Sequências automáticas e disparos únicos</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-800/50 rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === t.key
                ? "bg-purple-600 text-white shadow"
                : "text-gray-400 hover:text-white hover:bg-gray-700/50"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Campanhas tab ─────────────────────────────────────────────────── */}
      {activeTab === "campanhas" && (
        <div className="space-y-3">
          {campaigns.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <Mail size={48} className="mx-auto mb-4 opacity-30" />
              <p>Nenhuma campanha criada ainda.</p>
              <button
                onClick={() => setActiveTab("criar")}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
              >
                Criar primeira campanha
              </button>
            </div>
          )}
          {campaigns.map((c) => (
            <div key={c.id} className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-white font-semibold text-lg">{c.name}</h3>
                    <StatusBadge status={c.status} />
                  </div>
                  {c.description && <p className="text-gray-400 text-sm mt-1">{c.description}</p>}
                  <p className="text-gray-500 text-xs mt-2">
                    Remetente: <span className="text-gray-300">{c.fromEmail}</span> · Criada em{" "}
                    {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleStats(c.id)}
                    className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                    title="Ver estatísticas"
                  >
                    {loadingStats === c.id ? (
                      <Clock size={16} className="animate-spin" />
                    ) : expandedStats[c.id] !== undefined ? (
                      <ChevronUp size={16} />
                    ) : (
                      <BarChart2 size={16} />
                    )}
                  </button>
                  {c.status === "DRAFT" || c.status === "PAUSED" ? (
                    <button
                      onClick={() => handleStart(c.id)}
                      className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                      title="Iniciar campanha"
                    >
                      <Play size={16} />
                    </button>
                  ) : c.status === "ACTIVE" ? (
                    <button
                      onClick={() => handlePause(c.id)}
                      className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                      title="Pausar campanha"
                    >
                      <Pause size={16} />
                    </button>
                  ) : null}
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Remover campanha"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Stats panel */}
              {expandedStats[c.id] && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: "Total", value: expandedStats[c.id]!.recipients.total, icon: <Users size={14} /> },
                      { label: "Ativos", value: expandedStats[c.id]!.recipients.active, icon: <ArrowRight size={14} /> },
                      { label: "Concluídos", value: expandedStats[c.id]!.recipients.completed, icon: <CheckCircle size={14} /> },
                      { label: "Descadastrados", value: expandedStats[c.id]!.recipients.unsubscribed, icon: <XCircle size={14} /> },
                    ].map((m) => (
                      <div key={m.label} className="bg-gray-700/50 rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-1">
                          {m.icon} {m.label}
                        </div>
                        <div className="text-white font-bold text-xl">{m.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Passos</p>
                    {expandedStats[c.id]!.steps.map((s) => (
                      <div key={s.stepId} className="bg-gray-700/30 rounded-lg p-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <span className="text-xs text-gray-500 mr-2">#{s.order + 1}</span>
                          <span className="text-sm text-gray-200 truncate">{s.subject}</span>
                        </div>
                        <div className="flex gap-4 text-xs shrink-0">
                          <span className="text-gray-400"><Send size={10} className="inline mr-1" />{s.sent}</span>
                          <span className="text-blue-400">Abertos: {s.sent > 0 ? Math.round((s.opened / s.sent) * 100) : 0}%</span>
                          <span className="text-purple-400">Cliques: {s.sent > 0 ? Math.round((s.clicked / s.sent) * 100) : 0}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Criar tab ─────────────────────────────────────────────────────── */}
      {activeTab === "criar" && (
        <form onSubmit={handleCreate} className="space-y-6 max-w-3xl">
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6 space-y-4">
            <h2 className="text-white font-semibold text-lg">Informações da Campanha</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Prospecção Q3 2026"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Remetente (email) *</label>
                <input
                  type="email"
                  value={form.fromEmail}
                  onChange={(e) => setForm((p) => ({ ...p, fromEmail: e.target.value }))}
                  placeholder="voce@empresa.com"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Descrição (opcional)</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Breve descrição da campanha"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="text-xs text-gray-500 bg-gray-700/30 rounded-lg p-3">
              <p className="font-medium text-gray-400 mb-1">Variáveis disponíveis nos templates:</p>
              <div className="flex flex-wrap gap-2">
                {["{{nome}}", "{{empresa}}", "{{cargo}}", "{{email}}", "{{primeiro-nome}}", "{{link_descadastro}}"].map((v) => (
                  <code key={v} className="bg-gray-600/50 px-1.5 py-0.5 rounded text-purple-300">{v}</code>
                ))}
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg">Passos da Sequência</h2>
              <button
                type="button"
                onClick={addStep}
                className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                <Plus size={16} /> Adicionar passo
              </button>
            </div>
            <div className="space-y-4">
              {steps.map((step, i) => (
                <div key={i} className="bg-gray-700/40 border border-gray-600 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">
                      Passo {i + 1}{i === 0 ? " (envio inicial)" : ""}
                    </span>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(i)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-400 mb-1">Assunto *</label>
                      <input
                        type="text"
                        value={step.subject}
                        onChange={(e) => updateStep(i, "subject", e.target.value)}
                        placeholder="Assunto do email"
                        className="w-full bg-gray-600/50 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        {i === 0 ? "Enviar imediatamente" : "Aguardar (dias)"}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={step.delayDays}
                        onChange={(e) => updateStep(i, "delayDays", parseInt(e.target.value) || 0)}
                        disabled={i === 0}
                        className="w-full bg-gray-600/50 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 disabled:opacity-40"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Corpo do email (HTML ou texto) *</label>
                    <textarea
                      value={step.bodyHtml}
                      onChange={(e) => updateStep(i, "bodyHtml", e.target.value)}
                      placeholder={`Olá {{nome}},\n\nGostaria de apresentar nossos serviços...\n\n{{link_descadastro}}`}
                      rows={6}
                      className="w-full bg-gray-600/50 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-purple-500 resize-y"
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {creating ? <Clock size={16} className="animate-spin" /> : <Mail size={16} />}
              {creating ? "Criando..." : "Criar Campanha"}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("campanhas")}
              className="px-6 py-2.5 text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* ── Suppressions tab ──────────────────────────────────────────────── */}
      {activeTab === "suppressions" && (
        <div className="max-w-2xl space-y-6">
          <form onSubmit={handleAddSuppression} className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">Bloquear email manualmente</h2>
            <div className="flex gap-3">
              <input
                type="email"
                value={suppressEmail}
                onChange={(e) => setSuppressEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                required
              />
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-red-600/80 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
              >
                <ShieldOff size={16} /> Bloquear
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Emails bloqueados nunca receberão mensagens de nenhuma campanha.</p>
          </form>

          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">
              Lista de bloqueio ({suppressions.length})
            </h2>
            {suppressions.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhum email bloqueado.</p>
            ) : (
              <div className="space-y-2">
                {suppressions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-700/50 last:border-0">
                    <div>
                      <p className="text-sm text-white">{s.email}</p>
                      <p className="text-xs text-gray-500">
                        {s.reason === "manual" ? "Bloqueado manualmente" :
                         s.reason === "unsubscribed" ? "Descadastrado pelo destinatário" :
                         s.reason === "bounced" ? "Bounce" : s.reason} ·{" "}
                        {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveSuppression(s.email)}
                      className="text-gray-500 hover:text-red-400 transition-colors shrink-0"
                      title="Remover bloqueio"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
