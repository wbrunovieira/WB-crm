"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Mail, Plus, Play, Pause, BarChart2, Trash2, Users, ShieldOff,
  ChevronDown, ChevronUp, Send, ArrowRight, CheckCircle, Clock, XCircle,
  FileCode, Search, Group, UserPlus, Zap, ListChecks,
} from "lucide-react";
import { CampaignMetricsPanel, type CampaignMetrics } from "./CampaignMetricsPanel";
import { CampaignProgressPanel } from "./CampaignProgressPanel";

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
    order: number;
    subject: string;
    sent: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
  }[];
  recipients: { total: number; pending: number; active: number; completed: number; unsubscribed: number; bounced: number };
  totals: { sent: number; uniqueOpened: number; uniqueClicked: number; openRate: number; clickRate: number; bounceRate: number; unsubscribeRate: number };
  bySegment: { segment: string; total: number }[];
  byRole: { role: string; total: number }[];
  byRecipientType: { type: string; total: number }[];
}

interface Suppression {
  id: string;
  email: string;
  reason: string;
  createdAt: string;
}

interface EmailTemplate {
  name: string;
  label: string;
}

interface RecipientCandidate {
  key: string;
  entityType: "lead" | "organization";
  entityId: string;
  name: string;
  email?: string;
  emailCount: number;
  previewEmails: string[];
}

interface Props {
  campaigns: Campaign[];
  suppressions: Suppression[];
}

type Tab = "campanhas" | "metricas" | "criar" | "suppressions" | "progresso";
type EnrollMode = "todos" | "sourceGroup" | "buscar";

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

  // ── Metrics tab state ──
  const [selectedMetricsCampaign, setSelectedMetricsCampaign] = useState<string>("");
  const [metricsData, setMetricsData] = useState<CampaignMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // ── Create form state ──
  const SENDER_OPTIONS = ["bruno@wbdigitalsolutions.com", "bruno@saltoup.com"];
  const [form, setForm] = useState({ name: "", description: "", fromEmail: "bruno@wbdigitalsolutions.com" });
  const [steps, setSteps] = useState<CampaignStep[]>([
    { order: 0, subject: "", bodyHtml: "", delayDays: 0 },
  ]);
  const [creating, setCreating] = useState(false);

  // ── Template picker ──
  const [templates, setTemplates] = useState<EmailTemplate[] | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [openTemplatePicker, setOpenTemplatePicker] = useState<number | null>(null);

  // ── Enroll phase (after campaign creation) ──
  const [enrollCampaignId, setEnrollCampaignId] = useState<string | null>(null);
  const [enrollMode, setEnrollMode] = useState<EnrollMode>("todos");
  const [sourceGroups, setSourceGroups] = useState<string[]>([]);
  const [sourceGroupInput, setSourceGroupInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RecipientCandidate[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [searchLoading, setSearchLoading] = useState(false);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [totalEnrolled, setTotalEnrolled] = useState(0);

  // ── Progress tab state ──
  const [selectedProgressCampaign, setSelectedProgressCampaign] = useState<string>("");

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

  const loadMetrics = async (campaignId: string) => {
    if (!campaignId) return;
    setLoadingMetrics(true);
    setMetricsData(null);
    try {
      const data = await apiFetch<CampaignMetrics>(`/email-campaigns/${campaignId}/stats`, token);
      setMetricsData(data);
    } catch {
      toast.error("Erro ao carregar métricas");
    } finally {
      setLoadingMetrics(false);
    }
  };

  // ── Template picker helpers ───────────────────────────────────────────────

  const fetchTemplates = async () => {
    if (templates !== null) return;
    setLoadingTemplates(true);
    try {
      const list = await apiFetch<EmailTemplate[]>("/email-campaigns/templates", token);
      setTemplates(list);
    } catch {
      toast.error("Erro ao carregar templates");
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const applyTemplate = async (stepIdx: number, templateName: string) => {
    setOpenTemplatePicker(null);
    try {
      const { content } = await apiFetch<{ content: string }>(`/email-campaigns/templates/${templateName}`, token);
      setSteps((p) => p.map((s, i) => i === stepIdx ? { ...s, bodyHtml: content } : s));
    } catch {
      toast.error("Erro ao carregar template");
    }
  };

  // ── Enroll helpers ────────────────────────────────────────────────────────

  const enterEnrollPhase = async (campaignId: string) => {
    setEnrollCampaignId(campaignId);
    setTotalEnrolled(0);
    setEnrollMode("todos");
    try {
      const groups = await apiFetch<string[]>("/email-campaigns/source-groups", token);
      setSourceGroups(groups);
    } catch { /* non-critical */ }
  };

  const handleBulkEnroll = async (mode: "all" | "sourceGroup", sourceGroup?: string) => {
    if (!enrollCampaignId) return;
    setEnrollLoading(true);
    try {
      const result = await apiFetch<{ enrolled: number; skipped: number }>(
        `/email-campaigns/${enrollCampaignId}/enroll`, token,
        { method: "POST", body: JSON.stringify({ mode, sourceGroup }) },
      );
      setTotalEnrolled((p) => p + result.enrolled);
      toast.success(`${result.enrolled} destinatários adicionados${result.skipped ? ` (${result.skipped} duplicados ignorados)` : ""}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar destinatários");
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;
    setSearchLoading(true);
    try {
      const results = await apiFetch<RecipientCandidate[]>(
        `/email-campaigns/recipient-search?q=${encodeURIComponent(searchQuery)}`, token,
      );
      setSearchResults(results);
    } catch {
      toast.error("Erro na busca");
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleCandidate = (key: string) => {
    setSelectedCandidates((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const addSelectedCandidates = async () => {
    if (!enrollCampaignId || selectedCandidates.size === 0) return;
    const toAdd = searchResults.filter((r) => selectedCandidates.has(r.key));
    setEnrollLoading(true);
    try {
      let totalNewlyEnrolled = 0;
      for (const candidate of toAdd) {
        const result = await apiFetch<{ enrolled: number; skipped: number }>(
          `/email-campaigns/${enrollCampaignId}/enroll-entity`, token,
          { method: "POST", body: JSON.stringify({ entityType: candidate.entityType, entityId: candidate.entityId }) },
        );
        totalNewlyEnrolled += result.enrolled;
      }
      setTotalEnrolled((p) => p + totalNewlyEnrolled);
      setSelectedCandidates(new Set());
      setSearchResults([]);
      setSearchQuery("");
      toast.success(`${totalNewlyEnrolled} destinatário(s) adicionado(s)`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar");
    } finally {
      setEnrollLoading(false);
    }
  };

  const finishEnroll = () => {
    setEnrollCampaignId(null);
    setTotalEnrolled(0);
    setActiveTab("campanhas");
    refreshCampaigns();
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

  const handleSendNow = async (id: string) => {
    try {
      await apiFetch(`/email-campaigns/${id}/send-now`, token, { method: "POST" });
      toast.success("Envio iniciado! Acompanhe o progresso na aba Progresso.");
      setSelectedProgressCampaign(id);
      setActiveTab("progresso");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao iniciar envio";
      if (msg.includes("already in progress") || msg.includes("409")) {
        toast.error("Envio já está em andamento para esta campanha.");
      } else {
        toast.error(msg);
      }
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
    if (!form.name || steps.some((s) => !s.subject || !s.bodyHtml)) {
      toast.error("Preencha nome e todos os passos");
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
      toast.success("Campanha criada! Agora adicione os destinatários.");
      setForm({ name: "", description: "", fromEmail: "bruno@wbdigitalsolutions.com" });
      setSteps([{ order: 0, subject: "", bodyHtml: "", delayDays: 0 }]);
      await refreshCampaigns();
      await enterEnrollPhase(campaign.id);
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
    { key: "metricas", label: "Métricas", icon: <BarChart2 size={16} /> },
    { key: "progresso", label: "Progresso", icon: <ListChecks size={16} /> },
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
                    <>
                      <button
                        onClick={() => handleSendNow(c.id)}
                        className="p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
                        title="Enviar agora"
                      >
                        <Zap size={16} />
                      </button>
                      <button
                        onClick={() => handlePause(c.id)}
                        className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                        title="Pausar campanha"
                      >
                        <Pause size={16} />
                      </button>
                    </>
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
                      <div key={s.order} className="bg-gray-700/30 rounded-lg p-3 flex items-center justify-between gap-4">
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

      {/* ── Métricas tab ──────────────────────────────────────────────────── */}
      {activeTab === "metricas" && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <select
              value={selectedMetricsCampaign}
              onChange={(e) => {
                setSelectedMetricsCampaign(e.target.value);
                loadMetrics(e.target.value);
              }}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 min-w-[280px]"
            >
              <option value="">Selecione uma campanha...</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {selectedMetricsCampaign && (
              <button
                onClick={() => loadMetrics(selectedMetricsCampaign)}
                disabled={loadingMetrics}
                className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                {loadingMetrics ? <Clock size={14} className="animate-spin" /> : <BarChart2 size={14} />}
                Atualizar
              </button>
            )}
          </div>

          {!selectedMetricsCampaign && (
            <div className="text-center py-20 text-gray-500">
              <BarChart2 size={48} className="mx-auto mb-4 opacity-30" />
              <p>Selecione uma campanha para ver as métricas detalhadas.</p>
            </div>
          )}

          {selectedMetricsCampaign && loadingMetrics && (
            <div className="text-center py-20 text-gray-500">
              <Clock size={32} className="mx-auto mb-3 animate-spin opacity-50" />
              <p className="text-sm">Carregando métricas...</p>
            </div>
          )}

          {metricsData && !loadingMetrics && (
            <CampaignMetricsPanel metrics={metricsData} />
          )}
        </div>
      )}

      {/* ── Progresso tab ─────────────────────────────────────────────────── */}
      {activeTab === "progresso" && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <select
              value={selectedProgressCampaign}
              onChange={(e) => setSelectedProgressCampaign(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 min-w-[280px]"
            >
              <option value="">Selecione uma campanha...</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {selectedProgressCampaign ? (
            <CampaignProgressPanel
              campaignId={selectedProgressCampaign}
              token={token}
              totalSteps={campaigns.find((c) => c.id === selectedProgressCampaign) ? 0 : 0}
            />
          ) : (
            <div className="text-center py-20 text-gray-500">
              <ListChecks size={48} className="mx-auto mb-4 opacity-30" />
              <p>Selecione uma campanha para acompanhar o progresso de envio.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Criar tab ─────────────────────────────────────────────────────── */}
      {activeTab === "criar" && !enrollCampaignId && (
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
                <label className="block text-sm text-gray-300 mb-1">Remetente (email)</label>
                <select
                  value={form.fromEmail}
                  onChange={(e) => setForm((p) => ({ ...p, fromEmail: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  {SENDER_OPTIONS.map((email) => (
                    <option key={email} value={email}>{email}</option>
                  ))}
                </select>
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-gray-400">Corpo do email (HTML ou texto) *</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            fetchTemplates();
                            setOpenTemplatePicker(openTemplatePicker === i ? null : i);
                          }}
                          className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          {loadingTemplates ? <Clock size={12} className="animate-spin" /> : <FileCode size={12} />}
                          Usar Template
                        </button>
                        {openTemplatePicker === i && templates && (
                          <div className="absolute right-0 top-8 z-10 bg-gray-800 border border-gray-600 rounded-xl shadow-xl min-w-[260px]">
                            {templates.length === 0 ? (
                              <p className="text-xs text-gray-500 p-3">Nenhum template disponível</p>
                            ) : (
                              templates.map((t) => (
                                <button
                                  key={t.name}
                                  type="button"
                                  onClick={() => applyTemplate(i, t.name)}
                                  className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white first:rounded-t-xl last:rounded-b-xl transition-colors"
                                >
                                  {t.label}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
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

      {/* ── Fase 2: Adicionar Destinatários ───────────────────────────────── */}
      {activeTab === "criar" && enrollCampaignId && (
        <div className="max-w-3xl space-y-5">
          <div className="flex items-center gap-3">
            <UserPlus size={22} className="text-purple-400" />
            <div>
              <h2 className="text-white font-semibold text-lg">Adicionar Destinatários</h2>
              <p className="text-xs text-gray-400">Campanha criada. Escolha quem vai receber os emails.</p>
            </div>
            {totalEnrolled > 0 && (
              <span className="ml-auto text-sm text-green-400 font-medium">{totalEnrolled} adicionados</span>
            )}
          </div>

          {/* Mode selector */}
          <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1 w-fit">
            {([
              { key: "todos", label: "Todos", icon: <Users size={14} /> },
              { key: "sourceGroup", label: "Por Grupo", icon: <Group size={14} /> },
              { key: "buscar", label: "Buscar", icon: <Search size={14} /> },
            ] as { key: EnrollMode; label: string; icon: React.ReactNode }[]).map((m) => (
              <button
                key={m.key}
                onClick={() => setEnrollMode(m.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  enrollMode === m.key
                    ? "bg-purple-600 text-white shadow"
                    : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                }`}
              >
                {m.icon}{m.label}
              </button>
            ))}
          </div>

          {/* Todos */}
          {enrollMode === "todos" && (
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 space-y-4">
              <p className="text-sm text-gray-300">
                Adiciona todos os <span className="text-white font-medium">contactos de leads</span>,{" "}
                <span className="text-white font-medium">contactos de organizações</span> e{" "}
                <span className="text-white font-medium">emails de organizações</span> da sua conta (apenas com email preenchido).
              </p>
              <button
                onClick={() => handleBulkEnroll("all")}
                disabled={enrollLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {enrollLoading ? <Clock size={16} className="animate-spin" /> : <Users size={16} />}
                Adicionar Todos
              </button>
            </div>
          )}

          {/* Por SourceGroup */}
          {enrollMode === "sourceGroup" && (
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 space-y-4">
              <p className="text-sm text-gray-400">Selecione um grupo de importação (sourceGroup) para adicionar apenas os contactos desse grupo.</p>
              <div className="flex gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <input
                    list="sg-list"
                    value={sourceGroupInput}
                    onChange={(e) => setSourceGroupInput(e.target.value)}
                    placeholder="Ex: MatConstrPetropolis270426"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                  <datalist id="sg-list">
                    {sourceGroups.map((sg) => <option key={sg} value={sg} />)}
                  </datalist>
                </div>
                <button
                  onClick={() => handleBulkEnroll("sourceGroup", sourceGroupInput)}
                  disabled={enrollLoading || !sourceGroupInput.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {enrollLoading ? <Clock size={14} className="animate-spin" /> : <Group size={14} />}
                  Adicionar Grupo
                </button>
              </div>
              {sourceGroups.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {sourceGroups.map((sg) => (
                    <button
                      key={sg}
                      onClick={() => setSourceGroupInput(sg)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        sourceGroupInput === sg
                          ? "bg-purple-600 border-purple-500 text-white"
                          : "border-gray-600 text-gray-400 hover:border-purple-500 hover:text-purple-300"
                      }`}
                    >
                      {sg}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Buscar individual */}
          {enrollMode === "buscar" && (
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 space-y-4">
              <div className="flex gap-3">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Buscar por nome ou email..."
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={handleSearch}
                  disabled={searchLoading || searchQuery.trim().length < 2}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-500 disabled:opacity-50 transition-colors"
                >
                  {searchLoading ? <Clock size={14} className="animate-spin" /> : <Search size={14} />}
                  Buscar
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {searchResults.map((r) => (
                    <label
                      key={r.key}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-700/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCandidates.has(r.key)}
                        onChange={() => toggleCandidate(r.key)}
                        className="accent-purple-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white font-medium truncate">{r.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {r.previewEmails.join(", ")}
                          {r.emailCount > 3 ? ` +${r.emailCount - 3} mais` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-400">{r.emailCount} email{r.emailCount !== 1 ? "s" : ""}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          r.entityType === "lead"
                            ? "bg-purple-500/20 text-purple-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}>
                          {r.entityType === "lead" ? "Lead" : "Org"}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {selectedCandidates.size > 0 && (
                <button
                  onClick={addSelectedCandidates}
                  disabled={enrollLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {enrollLoading ? <Clock size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  Adicionar {selectedCandidates.size} selecionado(s)
                </button>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t border-gray-700 flex-wrap">
            <button
              onClick={finishEnroll}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              <CheckCircle size={16} /> Concluir
            </button>
            {enrollCampaignId && (
              <button
                onClick={async () => {
                  if (!enrollCampaignId) return;
                  const id = enrollCampaignId;
                  finishEnroll();
                  await handleSendNow(id);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                <Zap size={16} /> Enviar agora
              </button>
            )}
            <button
              onClick={() => { setEnrollCampaignId(null); setActiveTab("campanhas"); refreshCampaigns(); }}
              className="px-5 py-2.5 text-gray-400 hover:text-white transition-colors text-sm"
            >
              Pular — adicionar depois
            </button>
          </div>
        </div>
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
