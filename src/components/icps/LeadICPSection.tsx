"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Target, Plus, X, Loader2, ChevronDown, ChevronUp, Save, HelpCircle } from "lucide-react";
import { getLeadICPs, linkLeadToICP, unlinkLeadFromICP, updateLeadICP } from "@/actions/icp-links";
import { getICPs } from "@/actions/icps";
import type {
  ICPFitStatus,
  RealDecisionMaker,
  BusinessMoment,
  CurrentPlatform,
  MainDeclaredPain,
  StrategicDesire,
  NonClosingReason,
  EstimatedDecisionTime,
  PerceivedUrgency,
} from "@/lib/validations/icp";

// Label mappings with tooltips
const FIT_STATUS_LABELS: Record<ICPFitStatus, { label: string; tip: string }> = {
  ideal: { label: "Ideal", tip: "Cliente que se encaixa perfeitamente no perfil ideal" },
  partial: { label: "Parcial", tip: "Cliente com algumas características do ICP mas não todas" },
  out_of_icp: { label: "Fora do ICP", tip: "Cliente que não se encaixa no perfil ideal" },
};

const DECISION_MAKER_LABELS: Record<RealDecisionMaker, { label: string; tip: string }> = {
  founder_ceo: { label: "Fundador/CEO", tip: "Fundador ou CEO da empresa toma a decisão final" },
  tech_partner: { label: "Sócio Técnico", tip: "Sócio responsável pela área técnica decide" },
  commercial_partner: { label: "Sócio Comercial", tip: "Sócio responsável pela área comercial decide" },
  other: { label: "Outro", tip: "Outro cargo ou pessoa toma a decisão" },
};

const URGENCY_LABELS: Record<PerceivedUrgency, { label: string; tip: string; level: number }> = {
  curiosity: { label: "Curiosidade", tip: "Nível 1: Apenas curioso, sem necessidade real", level: 1 },
  interest: { label: "Interesse", tip: "Nível 2: Interessado mas sem urgência", level: 2 },
  future_need: { label: "Necessidade Futura", tip: "Nível 3: Vai precisar em breve", level: 3 },
  current_need: { label: "Necessidade Atual", tip: "Nível 4: Precisa resolver em curto prazo", level: 4 },
  active_pain: { label: "Dor Ativa", tip: "Nível 5: Precisa resolver AGORA - melhor preditor de fechamento", level: 5 },
};

const BUSINESS_MOMENT_LABELS: Record<BusinessMoment, { label: string; tip: string }> = {
  validation: { label: "Validação", tip: "Testando o modelo de negócio, fase inicial" },
  growth: { label: "Crescimento", tip: "Já validou e está crescendo a base de clientes" },
  scale: { label: "Escala", tip: "Crescimento acelerado, precisa de infraestrutura" },
  consolidation: { label: "Consolidação", tip: "Mercado maduro, foco em otimização" },
};

const PLATFORM_LABELS: Record<CurrentPlatform, { label: string; tip: string }> = {
  hotmart: { label: "Hotmart", tip: "Usa Hotmart como plataforma principal" },
  cademi: { label: "Cademi", tip: "Usa Cademi como plataforma principal" },
  moodle: { label: "Moodle", tip: "Usa Moodle (LMS open source)" },
  own_lms: { label: "LMS Próprio", tip: "Desenvolveu plataforma própria" },
  scattered_tools: { label: "Ferramentas Dispersas", tip: "Usa várias ferramentas não integradas" },
  other: { label: "Outro", tip: "Usa outra plataforma não listada" },
};

const PAIN_LABELS: Record<MainDeclaredPain, { label: string; tip: string }> = {
  student_experience: { label: "Experiência do Aluno", tip: "Alunos reclamam da experiência na plataforma" },
  operational_fragmentation: { label: "Fragmentação Operacional", tip: "Operação espalhada em muitas ferramentas" },
  lack_of_identity: { label: "Falta de Identidade", tip: "Marca não tem presença forte na plataforma" },
  growth_limitation: { label: "Limitação de Crescimento", tip: "Plataforma atual limita o crescimento" },
  founder_emotional_pain: { label: "Dor Emocional do Fundador", tip: "Fundador frustrado com a situação atual" },
};

const DESIRE_LABELS: Record<StrategicDesire, { label: string; tip: string }> = {
  total_control: { label: "Controle Total", tip: "Quer ter controle total sobre a plataforma" },
  own_identity: { label: "Identidade Própria", tip: "Quer construir marca própria forte" },
  scale_without_chaos: { label: "Escalar sem Caos", tip: "Quer crescer de forma organizada" },
  unify_operation: { label: "Unificar Operação", tip: "Quer centralizar tudo em um lugar" },
  market_differentiation: { label: "Diferenciação de Mercado", tip: "Quer se destacar da concorrência" },
};

const NON_CLOSING_LABELS: Record<NonClosingReason, { label: string; tip: string }> = {
  priority_changed: { label: "Prioridade Mudou", tip: "Outras prioridades surgiram" },
  budget: { label: "Orçamento", tip: "Sem budget no momento" },
  timing: { label: "Timing", tip: "Momento não é adequado" },
  internal_decision: { label: "Decisão Interna", tip: "Dependendo de decisões internas" },
  not_icp: { label: "Não é ICP", tip: "Não se encaixa no perfil ideal" },
  other: { label: "Outro", tip: "Outro motivo não listado" },
};

const DECISION_TIME_LABELS: Record<EstimatedDecisionTime, { label: string; tip: string }> = {
  less_than_2_weeks: { label: "< 2 semanas", tip: "Decisão muito rápida, alta urgência" },
  "2_to_4_weeks": { label: "2-4 semanas", tip: "Decisão em curto prazo" },
  "1_to_2_months": { label: "1-2 meses", tip: "Decisão em médio prazo" },
  "3_plus_months": { label: "3+ meses", tip: "Decisão em longo prazo" },
};

// Tooltip component
function Tooltip({ tip }: { tip: string }) {
  return (
    <div className="group relative inline-block ml-1">
      <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
        <div className="bg-gray-900 text-white text-sm rounded-lg py-2 px-3 max-w-xs whitespace-normal shadow-lg">
          {tip}
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
}

interface LeadICP {
  id: string;
  leadId: string;
  icpId: string;
  matchScore: number | null;
  notes: string | null;
  icpFitStatus: string | null;
  realDecisionMaker: string | null;
  realDecisionMakerOther: string | null;
  perceivedUrgency: string | null;
  businessMoment: string | null;
  currentPlatforms: string | null;
  fragmentationLevel: number | null;
  mainDeclaredPain: string | null;
  strategicDesire: string | null;
  perceivedTechnicalComplexity: number | null;
  purchaseTrigger: string | null;
  nonClosingReason: string | null;
  estimatedDecisionTime: string | null;
  expansionPotential: number | null;
  createdAt: Date;
  icp: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
}

interface ICP {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface LeadICPSectionProps {
  leadId: string;
  isConverted?: boolean;
}

export function LeadICPSection({ leadId, isConverted = false }: LeadICPSectionProps) {
  const router = useRouter();
  const [linkedICPs, setLinkedICPs] = useState<LeadICP[]>([]);
  const [availableICPs, setAvailableICPs] = useState<ICP[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedICP, setSelectedICP] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    matchScore: "",
    notes: "",
  });

  const [editData, setEditData] = useState<{
    matchScore: string;
    notes: string;
    icpFitStatus: string;
    realDecisionMaker: string;
    realDecisionMakerOther: string;
    perceivedUrgency: string[];
    businessMoment: string[];
    currentPlatforms: string[];
    fragmentationLevel: string;
    mainDeclaredPain: string;
    strategicDesire: string;
    perceivedTechnicalComplexity: string;
    purchaseTrigger: string;
    nonClosingReason: string;
    estimatedDecisionTime: string;
    expansionPotential: string;
  }>({
    matchScore: "",
    notes: "",
    icpFitStatus: "",
    realDecisionMaker: "",
    realDecisionMakerOther: "",
    perceivedUrgency: [],
    businessMoment: [],
    currentPlatforms: [],
    fragmentationLevel: "",
    mainDeclaredPain: "",
    strategicDesire: "",
    perceivedTechnicalComplexity: "",
    purchaseTrigger: "",
    nonClosingReason: "",
    estimatedDecisionTime: "",
    expansionPotential: "",
  });

  const loadData = useCallback(async () => {
    try {
      const [links, icps] = await Promise.all([
        getLeadICPs(leadId),
        getICPs({ status: "active" }),
      ]);
      setLinkedICPs(links);
      setAvailableICPs(icps);
    } catch (err) {
      console.error("Error loading ICPs:", err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedICP) return;

    setLinking(true);
    setError(null);

    try {
      await linkLeadToICP({
        leadId,
        icpId: selectedICP,
        matchScore: formData.matchScore ? parseInt(formData.matchScore) : undefined,
        notes: formData.notes || undefined,
      });
      setShowForm(false);
      setSelectedICP("");
      setFormData({ matchScore: "", notes: "" });
      await loadData();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao vincular ICP");
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (icpId: string) => {
    if (!confirm("Remover vínculo com este ICP?")) return;

    setUnlinking(icpId);
    try {
      await unlinkLeadFromICP(leadId, icpId);
      await loadData();
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao remover vínculo");
    } finally {
      setUnlinking(null);
    }
  };

  const parseJsonArray = (value: string | number | null | undefined): string[] => {
    if (value === null || value === undefined) return [];
    // Handle old integer format (1-5 for urgency)
    if (typeof value === 'number') {
      const urgencyMap: Record<number, string> = {
        1: 'curiosity',
        2: 'interest',
        3: 'future_need',
        4: 'current_need',
        5: 'active_pain',
      };
      return urgencyMap[value] ? [urgencyMap[value]] : [];
    }
    // Handle string - could be JSON array or single value
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // If not valid JSON, treat as single value
        return value ? [value] : [];
      }
    }
    return [];
  };

  const handleExpand = (link: LeadICP) => {
    if (expandedId === link.id) {
      setExpandedId(null);
    } else {
      setExpandedId(link.id);
      setEditData({
        matchScore: link.matchScore?.toString() || "",
        notes: link.notes || "",
        icpFitStatus: link.icpFitStatus || "",
        realDecisionMaker: link.realDecisionMaker || "",
        realDecisionMakerOther: link.realDecisionMakerOther || "",
        perceivedUrgency: parseJsonArray(link.perceivedUrgency),
        businessMoment: parseJsonArray(link.businessMoment),
        currentPlatforms: parseJsonArray(link.currentPlatforms),
        fragmentationLevel: link.fragmentationLevel?.toString() || "",
        mainDeclaredPain: link.mainDeclaredPain || "",
        strategicDesire: link.strategicDesire || "",
        perceivedTechnicalComplexity: link.perceivedTechnicalComplexity?.toString() || "",
        purchaseTrigger: link.purchaseTrigger || "",
        nonClosingReason: link.nonClosingReason || "",
        estimatedDecisionTime: link.estimatedDecisionTime || "",
        expansionPotential: link.expansionPotential?.toString() || "",
      });
    }
  };

  const handleSave = async (icpId: string) => {
    setSaving(true);
    setError(null);

    try {
      await updateLeadICP({
        leadId,
        icpId,
        matchScore: editData.matchScore ? parseInt(editData.matchScore) : null,
        notes: editData.notes || null,
        icpFitStatus: (editData.icpFitStatus as ICPFitStatus) || null,
        realDecisionMaker: (editData.realDecisionMaker as RealDecisionMaker) || null,
        realDecisionMakerOther: editData.realDecisionMakerOther || null,
        perceivedUrgency: editData.perceivedUrgency.length > 0 ? editData.perceivedUrgency as PerceivedUrgency[] : null,
        businessMoment: editData.businessMoment.length > 0 ? editData.businessMoment as BusinessMoment[] : null,
        currentPlatforms: editData.currentPlatforms.length > 0 ? editData.currentPlatforms as CurrentPlatform[] : null,
        fragmentationLevel: editData.fragmentationLevel ? parseInt(editData.fragmentationLevel) : null,
        mainDeclaredPain: (editData.mainDeclaredPain as MainDeclaredPain) || null,
        strategicDesire: (editData.strategicDesire as StrategicDesire) || null,
        perceivedTechnicalComplexity: editData.perceivedTechnicalComplexity ? parseInt(editData.perceivedTechnicalComplexity) : null,
        purchaseTrigger: editData.purchaseTrigger || null,
        nonClosingReason: (editData.nonClosingReason as NonClosingReason) || null,
        estimatedDecisionTime: (editData.estimatedDecisionTime as EstimatedDecisionTime) || null,
        expansionPotential: editData.expansionPotential ? parseInt(editData.expansionPotential) : null,
      });
      await loadData();
      setExpandedId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayItem = (field: 'currentPlatforms' | 'perceivedUrgency' | 'businessMoment', value: string) => {
    setEditData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((p) => p !== value)
        : [...prev[field], value],
    }));
  };

  const unlinkedICPs = availableICPs.filter(
    (icp) => !linkedICPs.some((link) => link.icpId === icp.id)
  );

  if (loading) {
    return (
      <div className="mt-6 rounded-xl bg-white p-6 shadow-md">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-gray-600">Carregando ICPs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-gray-100">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Target className="h-6 w-6 text-primary" />
          Perfis de Cliente Ideal (ICPs)
        </h2>
        {!isConverted && unlinkedICPs.length > 0 && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Vincular ICP
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <form onSubmit={handleLink} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 block text-base font-medium text-gray-700">
                Selecione o ICP *
              </label>
              <select
                value={selectedICP}
                onChange={(e) => setSelectedICP(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Selecione...</option>
                {unlinkedICPs.map((icp) => (
                  <option key={icp.id} value={icp.id}>
                    {icp.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-base font-medium text-gray-700">
                  Match Score (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.matchScore}
                  onChange={(e) => setFormData({ ...formData, matchScore: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ex: 85"
                />
              </div>
              <div>
                <label className="mb-1 block text-base font-medium text-gray-700">
                  Observações
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ex: Excelente fit"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={linking}
                className="rounded-md bg-primary px-4 py-2 text-base font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {linking ? "Vinculando..." : "Vincular"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {linkedICPs.length === 0 ? (
        <p className="text-base text-gray-500">
          Nenhum ICP vinculado a este lead.
          {unlinkedICPs.length > 0 && !isConverted && (
            <button
              onClick={() => setShowForm(true)}
              className="ml-1 text-primary hover:underline"
            >
              Vincular agora
            </button>
          )}
        </p>
      ) : (
        <div className="space-y-3">
          {linkedICPs.map((link) => (
            <div
              key={link.id}
              className="rounded-lg border border-gray-200 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-between p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/icps/${link.icp.id}`}
                      className="font-medium text-gray-900 hover:text-primary text-base"
                    >
                      {link.icp.name}
                    </Link>
                    {link.icpFitStatus && (
                      <span className={`rounded-full px-2 py-0.5 text-sm font-medium ${
                        link.icpFitStatus === "ideal"
                          ? "bg-green-100 text-green-700"
                          : link.icpFitStatus === "partial"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                      }`}>
                        {FIT_STATUS_LABELS[link.icpFitStatus as ICPFitStatus]?.label}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                    <span>/{link.icp.slug}</span>
                    {link.matchScore !== null && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-sm font-medium text-primary">
                        {link.matchScore}% match
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!isConverted && (
                    <>
                      <button
                        onClick={() => handleExpand(link)}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary"
                        title={expandedId === link.id ? "Fechar detalhes" : "Editar categorização"}
                      >
                        {expandedId === link.id ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleUnlink(link.icp.id)}
                        disabled={unlinking === link.icp.id}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-50"
                        title="Remover vínculo"
                      >
                        {unlinking === link.icp.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <X className="h-5 w-5" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {expandedId === link.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-5">
                  {error && (
                    <div className="mb-4 rounded-md bg-red-50 p-3 text-base text-red-700">
                      {error}
                    </div>
                  )}

                  {/* Basic Fields */}
                  <div className="mb-5 grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 flex items-center text-sm font-semibold text-gray-700">
                        Match Score (0-100)
                        <Tooltip tip="Pontuação de adequação ao ICP (0-100%)" />
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editData.matchScore}
                        onChange={(e) => setEditData({ ...editData, matchScore: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 flex items-center text-sm font-semibold text-gray-700">
                        Observações
                        <Tooltip tip="Notas adicionais sobre o lead" />
                      </label>
                      <input
                        type="text"
                        value={editData.notes}
                        onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Essential Fields */}
                  <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-600">Campos Essenciais</h4>
                  <div className="mb-5 grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 flex items-center text-sm font-semibold text-gray-700">
                        Status de Fit
                        <Tooltip tip="Quão bem o lead se encaixa no perfil ideal" />
                      </label>
                      <select
                        value={editData.icpFitStatus}
                        onChange={(e) => setEditData({ ...editData, icpFitStatus: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Selecione...</option>
                        {Object.entries(FIT_STATUS_LABELS).map(([value, { label }]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 flex items-center text-sm font-semibold text-gray-700">
                        Decisor Real
                        <Tooltip tip="Quem realmente toma a decisão de compra" />
                      </label>
                      <select
                        value={editData.realDecisionMaker}
                        onChange={(e) => setEditData({ ...editData, realDecisionMaker: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Selecione...</option>
                        {Object.entries(DECISION_MAKER_LABELS).map(([value, { label }]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    {editData.realDecisionMaker === "other" && (
                      <div>
                        <label className="mb-1.5 flex items-center text-sm font-semibold text-gray-700">
                          Outro Decisor
                          <Tooltip tip="Especifique qual cargo/pessoa toma a decisão" />
                        </label>
                        <input
                          type="text"
                          value={editData.realDecisionMakerOther}
                          onChange={(e) => setEditData({ ...editData, realDecisionMakerOther: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Ex: CTO"
                        />
                      </div>
                    )}
                  </div>

                  {/* Urgency - Multi-select */}
                  <div className="mb-5">
                    <label className="mb-2 flex items-center text-sm font-semibold text-gray-700">
                      Urgência Percebida
                      <Tooltip tip="Um dos melhores preditores de fechamento. Nível 5 (Dor Ativa) = maior probabilidade de fechar" />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(URGENCY_LABELS).map(([value, { label, level }]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleArrayItem('perceivedUrgency', value)}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                            editData.perceivedUrgency.includes(value)
                              ? level >= 4
                                ? "bg-red-600 text-white shadow-md"
                                : level >= 3
                                  ? "bg-yellow-500 text-white shadow-md"
                                  : "bg-primary text-white shadow-md"
                              : "!bg-white !text-[#350545] border border-[#350545] hover:!bg-gray-100"
                          }`}
                        >
                          {level}. {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Business Moment - Multi-select */}
                  <div className="mb-5">
                    <label className="mb-2 flex items-center text-sm font-semibold text-gray-700">
                      Momento do Negócio
                      <Tooltip tip="Em qual fase do negócio o lead está" />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(BUSINESS_MOMENT_LABELS).map(([value, { label }]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleArrayItem('businessMoment', value)}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                            editData.businessMoment.includes(value)
                              ? "bg-primary text-white shadow-md"
                              : "!bg-white !text-[#350545] border border-[#350545] hover:!bg-gray-100"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Specific Fields */}
                  <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-600">Campos Específicos</h4>

                  {/* Platforms - Multi-select */}
                  <div className="mb-5">
                    <label className="mb-2 flex items-center text-sm font-semibold text-gray-700">
                      Plataformas Atuais
                      <Tooltip tip="Quais plataformas o lead usa atualmente" />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(PLATFORM_LABELS).map(([value, { label }]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleArrayItem('currentPlatforms', value)}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                            editData.currentPlatforms.includes(value)
                              ? "bg-primary text-white shadow-md"
                              : "!bg-white !text-[#350545] border border-[#350545] hover:!bg-gray-100"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="mb-1.5 flex items-center text-sm font-semibold text-gray-700">
                        Fragmentação (0-10)
                        <Tooltip tip="Quão fragmentada está a operação do lead (0=unificada, 10=muito fragmentada)" />
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={editData.fragmentationLevel}
                        onChange={(e) => setEditData({ ...editData, fragmentationLevel: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 flex items-center text-sm font-semibold text-gray-700">
                        Dor Principal
                        <Tooltip tip="Principal dor/problema declarado pelo lead" />
                      </label>
                      <select
                        value={editData.mainDeclaredPain}
                        onChange={(e) => setEditData({ ...editData, mainDeclaredPain: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Selecione...</option>
                        {Object.entries(PAIN_LABELS).map(([value, { label }]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 flex items-center text-sm font-semibold text-gray-700">
                        Desejo Estratégico
                        <Tooltip tip="O que o lead deseja alcançar estrategicamente" />
                      </label>
                      <select
                        value={editData.strategicDesire}
                        onChange={(e) => setEditData({ ...editData, strategicDesire: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Selecione...</option>
                        {Object.entries(DESIRE_LABELS).map(([value, { label }]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 flex items-center text-sm font-semibold text-gray-700">
                        Complexidade (1-5)
                        <Tooltip tip="Complexidade técnica percebida da implementação (1=simples, 5=muito complexa)" />
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={editData.perceivedTechnicalComplexity}
                        onChange={(e) => setEditData({ ...editData, perceivedTechnicalComplexity: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Strategic Fields */}
                  <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-600">Campos Estratégicos</h4>
                  <div className="mb-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="col-span-2">
                      <label className="mb-1.5 flex items-center text-sm font-semibold text-gray-700">
                        Gatilho de Compra
                        <Tooltip tip="O que motivou o lead a buscar uma solução agora" />
                      </label>
                      <input
                        type="text"
                        value={editData.purchaseTrigger}
                        onChange={(e) => setEditData({ ...editData, purchaseTrigger: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Ex: Crescimento rápido de alunos"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 flex items-center text-sm font-semibold text-gray-700">
                        Não Fechamento
                        <Tooltip tip="Se não fechou, qual foi o principal motivo" />
                      </label>
                      <select
                        value={editData.nonClosingReason}
                        onChange={(e) => setEditData({ ...editData, nonClosingReason: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Selecione...</option>
                        {Object.entries(NON_CLOSING_LABELS).map(([value, { label }]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 flex items-center text-sm font-semibold text-gray-700">
                        Tempo Decisão
                        <Tooltip tip="Estimativa de quando o lead vai tomar a decisão" />
                      </label>
                      <select
                        value={editData.estimatedDecisionTime}
                        onChange={(e) => setEditData({ ...editData, estimatedDecisionTime: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Selecione...</option>
                        {Object.entries(DECISION_TIME_LABELS).map(([value, { label }]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 flex items-center text-sm font-semibold text-gray-700">
                        Expansão (1-5)
                        <Tooltip tip="Potencial de expansão/upsell futuro (1=baixo, 5=muito alto)" />
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={editData.expansionPotential}
                        onChange={(e) => setEditData({ ...editData, expansionPotential: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleSave(link.icp.id)}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-base font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Save className="h-5 w-5" />
                      )}
                      {saving ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      onClick={() => setExpandedId(null)}
                      className="rounded-md border border-gray-300 px-5 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
