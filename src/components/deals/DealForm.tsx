"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCreateDeal, useUpdateDeal } from "@/hooks/deals/use-deals";
import { toast } from "sonner";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

type Contact = {
  id: string;
  name: string;
  organizationId?: string | null;
  leadId?: string | null;
};

type Organization = {
  id: string;
  name: string;
};

type Lead = {
  id: string;
  businessName: string;
};

type Stage = {
  id: string;
  name: string;
  pipeline: {
    id: string;
    name: string;
    isDefault: boolean;
  };
};

type Deal = {
  id: string;
  title: string;
  description: string | null;
  value: number;
  currency: string;
  status: string;
  contactId: string | null;
  organizationId: string | null;
  leadId?: string | null;
  stageId: string;
  expectedCloseDate: string | Date | null;
};

type DealFormProps = {
  deal?: Deal;
  contacts: Contact[];
  organizations: Organization[];
  leads: Lead[];
  stages: Stage[];
  preselectedOrganizationId?: string;
};

/* ─── SearchableSelect ───────────────────────────────────────────────────────── */

type SearchableSelectProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  emptyLabel: string;
};

function SearchableSelect({ id, value, onChange, options, placeholder, emptyLabel }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase()),
  );

  // Close when clicking outside
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function openDropdown() {
    setOpen(true);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function select(optValue: string) {
    onChange(optValue);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative" id={id}>
      {/* Trigger */}
      <button
        type="button"
        onClick={openDropdown}
        className="mt-1 flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <span className={selected ? "text-gray-900" : "text-gray-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto">
            <li>
              <button
                type="button"
                onClick={() => select("")}
                className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
              >
                {emptyLabel}
              </button>
            </li>
            {filtered.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => select(opt.value)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-primary/10 ${
                    opt.value === value ? "bg-primary/10 font-medium text-primary" : "text-gray-900"
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-400">Nenhum resultado</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─── DealForm ───────────────────────────────────────────────────────────────── */

export default function DealForm({
  deal,
  contacts,
  organizations,
  leads,
  stages,
  preselectedOrganizationId,
}: DealFormProps) {
  const router = useRouter();
  const createMutation = useCreateDeal();
  const updateMutation = useUpdateDeal();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const [error, setError] = useState<string | null>(null);

  // Determine initial link type
  const initialLinkType = deal?.leadId ? "lead" : "organization";

  const [linkType, setLinkType] = useState<"organization" | "lead">(initialLinkType);
  const [formData, setFormData] = useState({
    title: deal?.title || "",
    description: deal?.description || "",
    value: deal?.value || 0,
    currency: deal?.currency || "BRL",
    status: deal?.status || "open",
    contactId: deal?.contactId || "",
    organizationId: deal?.organizationId || preselectedOrganizationId || "",
    leadId: deal?.leadId || "",
    stageId: deal?.stageId || "",
    expectedCloseDate: deal?.expectedCloseDate
      ? new Date(deal.expectedCloseDate).toISOString().split("T")[0]
      : "",
  });

  // Filter contacts based on selected link
  const filteredContacts = contacts.filter((c) => {
    if (linkType === "organization" && formData.organizationId) {
      return c.organizationId === formData.organizationId;
    }
    if (linkType === "lead" && formData.leadId) {
      return c.leadId === formData.leadId;
    }
    // No org/lead selected → show all
    return true;
  });

  function handleLinkTypeChange(type: "organization" | "lead") {
    setLinkType(type);
    // Clear the other field and reset contact
    if (type === "organization") {
      setFormData((f) => ({ ...f, leadId: "", contactId: "" }));
    } else {
      setFormData((f) => ({ ...f, organizationId: "", contactId: "" }));
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      title: formData.title,
      description: formData.description || undefined,
      value: Number(formData.value),
      currency: formData.currency,
      status: formData.status as "open" | "won" | "lost",
      contactId: formData.contactId || null,
      organizationId: linkType === "organization" ? (formData.organizationId || null) : null,
      leadId: linkType === "lead" ? (formData.leadId || null) : null,
      stageId: formData.stageId,
      expectedCloseDate: formData.expectedCloseDate || undefined,
    };

    try {
      if (deal) {
        await updateMutation.mutateAsync({ id: deal.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      toast.success(deal ? "Negócio atualizado!" : "Negócio criado!");
      router.push("/deals");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar negócio");
    }
  };

  const orgOptions = organizations.map((o) => ({ value: o.id, label: o.name }));
  const leadOptions = leads.map((l) => ({ value: l.id, label: l.businessName }));
  const contactOptions = filteredContacts.map((c) => ({ value: c.id, label: c.name }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Título *
        </label>
        <input
          type="text"
          id="title"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Descrição / Observações
        </label>
        <textarea
          id="description"
          rows={4}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Registre aqui propostas enviadas, condições negociadas, observações..."
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="value" className="block text-sm font-medium text-gray-700">
            Valor *
          </label>
          <input
            type="number"
            id="value"
            required
            min="0"
            step="0.01"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
            Moeda
          </label>
          <select
            id="currency"
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
          >
            <option value="BRL">BRL - Real</option>
            <option value="USD">USD - Dólar</option>
            <option value="EUR">EUR - Euro</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="stageId" className="block text-sm font-medium text-gray-700">
          Estágio *
        </label>
        <select
          id="stageId"
          required
          value={formData.stageId}
          onChange={(e) => setFormData({ ...formData, stageId: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
        >
          <option value="">Selecione um estágio</option>
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.pipeline.name} - {stage.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
          Status *
        </label>
        <select
          id="status"
          required
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
        >
          <option value="open">Aberto</option>
          <option value="won">Ganho</option>
          <option value="lost">Perdido</option>
        </select>
      </div>

      {/* Link to Organization or Lead */}
      <div className="rounded-md border border-gray-200 p-4">
        <p className="mb-3 text-sm font-medium text-gray-700">Vincular a</p>
        <div className="mb-4 flex gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="linkType"
              value="organization"
              checked={linkType === "organization"}
              onChange={() => handleLinkTypeChange("organization")}
              className="accent-primary"
            />
            Organização
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="linkType"
              value="lead"
              checked={linkType === "lead"}
              onChange={() => handleLinkTypeChange("lead")}
              className="accent-primary"
            />
            Lead
          </label>
        </div>

        {linkType === "organization" ? (
          <div>
            <label className="block text-sm font-medium text-gray-700">Organização</label>
            <SearchableSelect
              id="organizationId"
              value={formData.organizationId}
              onChange={(v) => setFormData({ ...formData, organizationId: v, contactId: "" })}
              options={orgOptions}
              placeholder="Selecione uma organização"
              emptyLabel="Nenhuma organização"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700">Lead</label>
            <SearchableSelect
              id="leadId"
              value={formData.leadId}
              onChange={(v) => setFormData({ ...formData, leadId: v, contactId: "" })}
              options={leadOptions}
              placeholder="Selecione um lead"
              emptyLabel="Nenhum lead"
            />
          </div>
        )}
      </div>

      {/* Contact — filtered by selected org or lead */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Contato
          {(formData.organizationId || formData.leadId) && (
            <span className="ml-1 text-xs text-gray-400">
              ({filteredContacts.length} disponível{filteredContacts.length !== 1 ? "is" : ""})
            </span>
          )}
        </label>
        <SearchableSelect
          id="contactId"
          value={formData.contactId}
          onChange={(v) => setFormData({ ...formData, contactId: v })}
          options={contactOptions}
          placeholder="Selecione um contato"
          emptyLabel="Nenhum contato"
        />
      </div>

      <div>
        <label htmlFor="expectedCloseDate" className="block text-sm font-medium text-gray-700">
          Data Prevista de Fechamento
        </label>
        <input
          type="date"
          id="expectedCloseDate"
          value={formData.expectedCloseDate}
          onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
        />
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {isSubmitting ? "Salvando..." : deal ? "Atualizar Negócio" : "Criar Negócio"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
