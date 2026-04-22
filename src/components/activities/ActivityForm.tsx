"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCreateActivity, useUpdateActivity } from "@/hooks/activities/use-activities";

type Contact = {
  id: string;
  name: string;
  organization?: { id: string; name: string } | null;
  lead?: { id: string; businessName: string } | null;
  partner?: { id: string; name: string } | null;
};

type Deal = {
  id: string;
  title: string;
};

type LeadContactItem = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  isPrimary: boolean;
};

type Lead = {
  id: string;
  businessName: string;
  leadContacts?: LeadContactItem[];
};

type Organization = {
  id: string;
  name: string;
};

type Activity = {
  id: string;
  type: string;
  subject: string;
  description?: string | null;
  dueDate?: string | Date | null;
  completed: boolean;
  dealId?: string | null;
  contactId?: string | null;
  contactIds?: string | null;
  leadContactIds?: string | null;
  leadId?: string | null;
  organizationId?: string | null;
  callContactType?: string | null;
  meetingNoShow?: boolean;
};

type ActivityFormProps = {
  activity?: Activity;
  contacts: Contact[];
  deals: Deal[];
  leads: Lead[];
  organizations?: Organization[];
};

/* ─── Searchable Select ─────────────────────────────────────────────────── */

function SearchableSelect({
  label,
  value,
  options,
  placeholder,
  emptyLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  placeholder: string;
  emptyLabel: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.id === value);
  const filtered = options.filter((o) =>
    !query || o.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-left text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-white"
        >
          <span className={selected ? "text-gray-900" : "text-gray-400"}>
            {selected ? selected.label : emptyLabel}
          </span>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">▾</span>
        </button>

        {open && (
          <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
            <div className="p-2 border-b border-gray-100">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <ul className="max-h-52 overflow-y-auto">
              <li>
                <button
                  type="button"
                  onClick={() => { onChange(""); setQuery(""); setOpen(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
                >
                  {emptyLabel}
                </button>
              </li>
              {filtered.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => { onChange(o.id); setQuery(""); setOpen(false); }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      o.id === value ? "font-medium text-primary" : "text-gray-900"
                    }`}
                  >
                    {o.label}
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-3 py-4 text-center text-sm text-gray-400">
                  Nenhum resultado
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Form ─────────────────────────────────────────────────────────── */

export default function ActivityForm({
  activity,
  contacts,
  deals,
  leads,
  organizations = [],
}: ActivityFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();
  const isSubmitting = createActivity.isPending || updateActivity.isPending;
  const [error, setError] = useState<string | null>(null);

  const getInitialContactIds = (): string[] => {
    if (activity?.contactIds) {
      try { return JSON.parse(activity.contactIds); } catch { return []; }
    }
    if (activity?.contactId) return [activity.contactId];
    const paramContactId = searchParams.get("contactId");
    return paramContactId ? [paramContactId] : [];
  };

  const getInitialLeadContactIds = (): string[] => {
    if (activity?.leadContactIds) {
      try { return JSON.parse(activity.leadContactIds); } catch { return []; }
    }
    return [];
  };

  const [formData, setFormData] = useState({
    type: activity?.type || "task",
    subject: activity?.subject || "",
    description: activity?.description || "",
    dueDate: activity?.dueDate
      ? new Date(activity.dueDate).toISOString().split("T")[0]
      : "",
    completed: activity?.completed || false,
    dealId: activity?.dealId || searchParams.get("dealId") || "",
    leadId: activity?.leadId || searchParams.get("leadId") || "",
    organizationId: activity?.organizationId || searchParams.get("organizationId") || "",
    callContactType: activity?.callContactType || "gatekeeper",
    meetingNoShow: activity?.meetingNoShow || false,
  });

  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(getInitialContactIds());
  const [selectedLeadContactIds, setSelectedLeadContactIds] = useState<string[]>(getInitialLeadContactIds());
  const [contactSearch, setContactSearch] = useState("");
  const [showContactDropdown, setShowContactDropdown] = useState(false);

  const selectedLead = formData.leadId ? leads.find((l) => l.id === formData.leadId) : null;
  const hasLeadContacts = !!selectedLead?.leadContacts?.length;

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase()),
  );
  const filteredLeadContacts = hasLeadContacts
    ? selectedLead!.leadContacts!.filter((c) =>
        c.name.toLowerCase().includes(contactSearch.toLowerCase()),
      )
    : [];

  const selectedContacts = contacts.filter((c) => selectedContactIds.includes(c.id));
  const selectedLeadContacts = hasLeadContacts
    ? selectedLead!.leadContacts!.filter((c) => selectedLeadContactIds.includes(c.id))
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const data = {
      type: formData.type,
      subject: formData.subject,
      description: formData.description || undefined,
      dueDate: formData.dueDate
        ? new Date(formData.dueDate + "T12:00:00").toISOString()
        : null,
      completed: formData.completed,
      contactIds: selectedContactIds.length > 0 ? selectedContactIds : null,
      leadContactIds: selectedLeadContactIds.length > 0 ? selectedLeadContactIds : null,
      dealId: formData.dealId || null,
      leadId: formData.leadId || null,
      organizationId: formData.organizationId || null,
      callContactType: formData.type === "call" ? formData.callContactType : null,
      meetingNoShow: formData.type === "meeting" ? formData.meetingNoShow : false,
    };

    if (activity) {
      updateActivity.mutate(
        { id: activity.id, ...data },
        {
          onSuccess: () => { router.push("/activities"); router.refresh(); },
          onError: (err) => setError(err instanceof Error ? err.message : "Erro ao atualizar atividade"),
        },
      );
    } else {
      createActivity.mutate(data, {
        onSuccess: () => { router.push("/activities"); router.refresh(); },
        onError: (err) => setError(err instanceof Error ? err.message : "Erro ao criar atividade"),
      });
    }
  };

  const addContact = (contactId: string) => {
    if (!selectedContactIds.includes(contactId)) setSelectedContactIds((p) => [...p, contactId]);
    setContactSearch("");
    setShowContactDropdown(false);
  };
  const removeContact = (contactId: string) => setSelectedContactIds((p) => p.filter((id) => id !== contactId));

  const addLeadContact = (contactId: string) => {
    if (!selectedLeadContactIds.includes(contactId)) setSelectedLeadContactIds((p) => [...p, contactId]);
    setContactSearch("");
    setShowContactDropdown(false);
  };
  const removeLeadContact = (contactId: string) => setSelectedLeadContactIds((p) => p.filter((id) => id !== contactId));

  const handleLeadChange = (newLeadId: string) => {
    setFormData({ ...formData, leadId: newLeadId });
    setSelectedLeadContactIds([]);
    setContactSearch("");
  };

  const getCompanyName = (contact: Contact) => {
    if (contact.organization) return contact.organization.name;
    if (contact.lead) return contact.lead.businessName;
    if (contact.partner) return contact.partner.name;
    return "Sem empresa";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Tipo */}
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700">Tipo *</label>
        <select
          id="type"
          required
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
        >
          <option value="call">📞 Ligação</option>
          <option value="meeting">📅 Reunião</option>
          <option value="email">✉️ E-mail</option>
          <option value="task">📋 Tarefa</option>
          <option value="whatsapp">💬 WhatsApp</option>
          <option value="visit">📍 Visita Física</option>
          <option value="instagram">📷 Instagram</option>
          <option value="linkedin">💼 LinkedIn</option>
        </select>
      </div>

      {/* Tipo de contato — ligações */}
      {formData.type === "call" && (
        <div>
          <label htmlFor="callContactType" className="block text-sm font-medium text-gray-700">Tipo de contato</label>
          <select
            id="callContactType"
            value={formData.callContactType}
            onChange={(e) => setFormData({ ...formData, callContactType: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
          >
            <option value="gatekeeper">🚧 Gatekeeper</option>
            <option value="decisor">🎯 Decisor</option>
          </select>
        </div>
      )}

      {/* No-show — reuniões */}
      {formData.type === "meeting" && (
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="meetingNoShow"
            checked={formData.meetingNoShow}
            onChange={(e) => setFormData({ ...formData, meetingNoShow: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="meetingNoShow" className="text-sm font-medium text-gray-700">
            No-show (reunião não realizada)
          </label>
        </div>
      )}

      {/* Assunto */}
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Assunto *</label>
        <input
          type="text"
          id="subject"
          required
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
        />
      </div>

      {/* Descrição */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descrição</label>
        <textarea
          id="description"
          rows={4}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
        />
      </div>

      {/* Data */}
      <div>
        <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">Data de Vencimento</label>
        <input
          type="date"
          id="dueDate"
          value={formData.dueDate}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
        />
      </div>

      {/* Negócio */}
      <div>
        <label htmlFor="dealId" className="block text-sm font-medium text-gray-700">Negócio</label>
        <select
          id="dealId"
          value={formData.dealId}
          onChange={(e) => setFormData({ ...formData, dealId: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
        >
          <option value="">Nenhum negócio</option>
          {deals.map((deal) => (
            <option key={deal.id} value={deal.id}>{deal.title}</option>
          ))}
        </select>
      </div>

      {/* Lead — searchable, sem arquivados */}
      <SearchableSelect
        label="Lead"
        value={formData.leadId}
        options={leads.map((l) => ({ id: l.id, label: l.businessName }))}
        placeholder="Buscar lead..."
        emptyLabel="Nenhum lead"
        onChange={(id) => handleLeadChange(id)}
      />

      {/* Organização — searchable */}
      {organizations.length > 0 && (
        <SearchableSelect
          label="Organização"
          value={formData.organizationId}
          options={organizations.map((o) => ({ id: o.id, label: o.name }))}
          placeholder="Buscar organização..."
          emptyLabel="Nenhuma organização"
          onChange={(id) => setFormData({ ...formData, organizationId: id })}
        />
      )}

      {/* Contatos do Lead */}
      {hasLeadContacts && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Contatos do Lead</label>

          {selectedLeadContacts.length > 0 && (
            <div className="mb-3 space-y-2">
              {selectedLeadContacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between bg-purple-900 border border-purple-700 rounded-md px-3 py-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-100">
                      {contact.name}
                      {contact.isPrimary && <span className="ml-2 text-xs text-purple-300">Principal</span>}
                    </p>
                    <div className="flex items-center gap-2">
                      {contact.role && <span className="text-xs text-purple-300">{contact.role}</span>}
                      {contact.email && <span className="text-xs text-purple-400">{contact.email}</span>}
                    </div>
                  </div>
                  <button type="button" onClick={() => removeLeadContact(contact.id)} className="text-red-400 hover:text-red-300 ml-2">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              placeholder="Buscar contato do lead..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              onFocus={() => setShowContactDropdown(true)}
              onBlur={() => setTimeout(() => setShowContactDropdown(false), 200)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
            />
            {showContactDropdown && (contactSearch ? filteredLeadContacts : selectedLead!.leadContacts!).length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {(contactSearch ? filteredLeadContacts : selectedLead!.leadContacts!).map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => addLeadContact(contact.id)}
                    disabled={selectedLeadContactIds.includes(contact.id)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {contact.name}
                      {contact.isPrimary && <span className="ml-2 text-xs text-purple-600">Principal</span>}
                      {selectedLeadContactIds.includes(contact.id) && <span className="ml-2 text-xs text-green-600">✓ Selecionado</span>}
                    </p>
                    <div className="flex items-center gap-2">
                      {contact.role && <span className="text-xs text-gray-500">{contact.role}</span>}
                      {contact.email && <span className="text-xs text-gray-400">{contact.email}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedLeadContacts.length > 0 && (
            <p className="mt-2 text-sm text-gray-500">
              {selectedLeadContacts.length} {selectedLeadContacts.length === 1 ? "contato selecionado" : "contatos selecionados"}
            </p>
          )}
        </div>
      )}

      {/* Contatos globais */}
      {!hasLeadContacts && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Contatos</label>

          {selectedContacts.length > 0 && (
            <div className="mb-3 space-y-2">
              {selectedContacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-md px-3 py-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-200">{contact.name}</p>
                    <p className="text-xs text-gray-400">{getCompanyName(contact)}</p>
                  </div>
                  <button type="button" onClick={() => removeContact(contact.id)} className="text-red-400 hover:text-red-300 ml-2">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              placeholder="Buscar contato..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              onFocus={() => setShowContactDropdown(true)}
              onBlur={() => setTimeout(() => setShowContactDropdown(false), 200)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
            />
            {showContactDropdown && contactSearch && filteredContacts.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => addContact(contact.id)}
                    disabled={selectedContactIds.includes(contact.id)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {contact.name}
                      {selectedContactIds.includes(contact.id) && <span className="ml-2 text-xs text-green-600">✓ Selecionado</span>}
                    </p>
                    <p className="text-xs text-gray-500">{getCompanyName(contact)}</p>
                  </button>
                ))}
              </div>
            )}
            {showContactDropdown && contactSearch && filteredContacts.length === 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg p-3">
                <p className="text-sm text-gray-500">Nenhum contato encontrado</p>
              </div>
            )}
          </div>

          {selectedContacts.length > 0 && (
            <p className="mt-2 text-sm text-gray-500">
              {selectedContacts.length} {selectedContacts.length === 1 ? "contato selecionado" : "contatos selecionados"}
            </p>
          )}
        </div>
      )}

      {/* Concluída */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="completed"
          checked={formData.completed}
          onChange={(e) => setFormData({ ...formData, completed: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <label htmlFor="completed" className="ml-2 block text-sm text-gray-900">
          Marcar como concluída
        </label>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {isSubmitting ? "Salvando..." : activity ? "Atualizar Atividade" : "Criar Atividade"}
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
