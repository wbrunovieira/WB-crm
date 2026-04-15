"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { createSector, updateSector } from "@/actions/sectors";
import type { SectorFormData } from "@/lib/validations/sector";
import { toast } from "sonner";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type Sector = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  marketSize: string | null;
  marketSizeNotes: string | null;
  averageTicket: string | null;
  budgetSeason: string | null;
  salesCycleDays: number | null;
  salesCycleNotes: string | null;
  decisionMakers: string | null;
  buyingProcess: string | null;
  mainObjections: string | null;
  mainPains: string | null;
  referenceCompanies: string | null;
  competitorsLandscape: string | null;
  jargons: string | null;
  regulatoryNotes: string | null;
};

interface SectorFormProps {
  editingSector?: Sector | null;
  onCancelEdit?: () => void;
}

const empty: SectorFormData = {
  name: "",
  slug: "",
  description: null,
  isActive: true,
  marketSize: null,
  marketSizeNotes: null,
  averageTicket: null,
  budgetSeason: null,
  salesCycleDays: null,
  salesCycleNotes: null,
  decisionMakers: null,
  buyingProcess: null,
  mainObjections: null,
  mainPains: null,
  referenceCompanies: null,
  competitorsLandscape: null,
  jargons: null,
  regulatoryNotes: null,
};

export function SectorForm({ editingSector, onCancelEdit }: SectorFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<SectorFormData>(empty);
  const [slugManual, setSlugManual] = useState(false);

  const isEditing = !!editingSector;

  useEffect(() => {
    if (editingSector) {
      setForm({
        name: editingSector.name,
        slug: editingSector.slug,
        description: editingSector.description,
        isActive: editingSector.isActive,
        marketSize: editingSector.marketSize,
        marketSizeNotes: editingSector.marketSizeNotes,
        averageTicket: editingSector.averageTicket,
        budgetSeason: editingSector.budgetSeason,
        salesCycleDays: editingSector.salesCycleDays,
        salesCycleNotes: editingSector.salesCycleNotes,
        decisionMakers: editingSector.decisionMakers,
        buyingProcess: editingSector.buyingProcess,
        mainObjections: editingSector.mainObjections,
        mainPains: editingSector.mainPains,
        referenceCompanies: editingSector.referenceCompanies,
        competitorsLandscape: editingSector.competitorsLandscape,
        jargons: editingSector.jargons,
        regulatoryNotes: editingSector.regulatoryNotes,
      });
      setSlugManual(true);
    } else {
      setForm(empty);
      setSlugManual(false);
    }
  }, [editingSector]);

  const handleNameChange = (value: string) => {
    setForm((f) => ({
      ...f,
      name: value,
      slug: slugManual ? f.slug : slugify(value),
    }));
  };

  const handleSlugChange = (value: string) => {
    setSlugManual(true);
    setForm((f) => ({ ...f, slug: value }));
  };

  const set = (key: keyof SectorFormData, value: string | number | boolean | null) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      if (isEditing && editingSector) {
        await updateSector(editingSector.id, form);
        toast.success("Setor atualizado");
        onCancelEdit?.();
      } else {
        await createSector(form);
        toast.success("Setor criado");
        setForm(empty);
        setSlugManual(false);
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar setor");
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";
  const labelClass = "block text-xs font-semibold text-gray-600 mb-1";
  const sectionClass = "space-y-3 pt-3 border-t border-gray-100";
  const sectionTitle = "text-xs font-bold text-gray-500 uppercase tracking-wider mb-2";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEditing ? `Editar: ${editingSector?.name}` : "Novo Setor"}
        </h2>
        {isEditing && (
          <button onClick={onCancelEdit} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name + Slug */}
        <div>
          <label className={labelClass}>Nome *</label>
          <input
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="ex: Clínicas Médicas"
            className={fieldClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Slug</label>
          <input
            value={form.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="clinicas-medicas"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>Descrição geral</label>
          <textarea
            value={form.description ?? ""}
            onChange={(e) => set("description", e.target.value || null)}
            rows={2}
            className={fieldClass}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive ?? true}
            onChange={(e) => set("isActive", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="isActive" className="text-sm text-gray-700">Ativo</label>
        </div>

        {/* Market */}
        <div className={sectionClass}>
          <p className={sectionTitle}>Mercado</p>
          <div>
            <label className={labelClass}>Tamanho do mercado</label>
            <input
              value={form.marketSize ?? ""}
              onChange={(e) => set("marketSize", e.target.value || null)}
              placeholder="ex: R$ 250 bilhões/ano no Brasil"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Notas sobre o mercado</label>
            <textarea
              value={form.marketSizeNotes ?? ""}
              onChange={(e) => set("marketSizeNotes", e.target.value || null)}
              placeholder="Crescimento, fragmentação, tendências..."
              rows={2}
              className={fieldClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Ticket médio</label>
              <input
                value={form.averageTicket ?? ""}
                onChange={(e) => set("averageTicket", e.target.value || null)}
                placeholder="ex: R$ 8k – 60k/ano"
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Época de compra</label>
              <input
                value={form.budgetSeason ?? ""}
                onChange={(e) => set("budgetSeason", e.target.value || null)}
                placeholder="ex: Jan–Mar e Ago–Set"
                className={fieldClass}
              />
            </div>
          </div>
        </div>

        {/* Sales cycle */}
        <div className={sectionClass}>
          <p className={sectionTitle}>Ciclo de venda</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Ciclo médio (dias)</label>
              <input
                type="number"
                value={form.salesCycleDays ?? ""}
                onChange={(e) => set("salesCycleDays", e.target.value ? Number(e.target.value) : null)}
                min={1}
                placeholder="45"
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Notas sobre o ciclo</label>
              <input
                value={form.salesCycleNotes ?? ""}
                onChange={(e) => set("salesCycleNotes", e.target.value || null)}
                placeholder="Pequenas decidem em 2 sem..."
                className={fieldClass}
              />
            </div>
          </div>
        </div>

        {/* Buyer profile */}
        <div className={sectionClass}>
          <p className={sectionTitle}>Perfil do comprador</p>
          <div>
            <label className={labelClass}>Tomadores de decisão</label>
            <input
              value={form.decisionMakers ?? ""}
              onChange={(e) => set("decisionMakers", e.target.value || null)}
              placeholder="ex: Dono da clínica, sócio-gestor"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Processo de compra</label>
            <textarea
              value={form.buyingProcess ?? ""}
              onChange={(e) => set("buyingProcess", e.target.value || null)}
              placeholder="Pesquisa → indicação → demo → proposta..."
              rows={2}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Objeções mais comuns</label>
            <textarea
              value={form.mainObjections ?? ""}
              onChange={(e) => set("mainObjections", e.target.value || null)}
              placeholder="Sem tempo para implantação, já tem sistema..."
              rows={2}
              className={fieldClass}
            />
          </div>
        </div>

        {/* Market knowledge */}
        <div className={sectionClass}>
          <p className={sectionTitle}>Conhecimento do setor</p>
          <div>
            <label className={labelClass}>Principais dores</label>
            <textarea
              value={form.mainPains ?? ""}
              onChange={(e) => set("mainPains", e.target.value || null)}
              placeholder="Gestão de agendamentos, prontuário eletrônico..."
              rows={2}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Empresas referência</label>
            <textarea
              value={form.referenceCompanies ?? ""}
              onChange={(e) => set("referenceCompanies", e.target.value || null)}
              placeholder="Unimed, Dasa, Hapvida, iClinic..."
              rows={2}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Concorrentes</label>
            <input
              value={form.competitorsLandscape ?? ""}
              onChange={(e) => set("competitorsLandscape", e.target.value || null)}
              placeholder="iClinic, MedPlus, HiDoctor..."
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Jargões e termos específicos</label>
            <textarea
              value={form.jargons ?? ""}
              onChange={(e) => set("jargons", e.target.value || null)}
              placeholder="PEP, CFM, TUSS, glosa, SADT..."
              rows={2}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Notas regulatórias / compliance</label>
            <textarea
              value={form.regulatoryNotes ?? ""}
              onChange={(e) => set("regulatoryNotes", e.target.value || null)}
              placeholder="LGPD, resoluções de conselho, certificações..."
              rows={2}
              className={fieldClass}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || !form.name.trim()}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Salvar alterações" : "Criar setor"}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
