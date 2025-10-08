"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createActivity, updateActivity } from "@/actions/activities";

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

type Lead = {
  id: string;
  businessName: string;
};

type Activity = {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  dueDate: Date | null;
  completed: boolean;
  dealId: string | null;
  contactId: string | null;
  contactIds: string | null;
  leadId: string | null;
};

type ActivityFormProps = {
  activity?: Activity;
  contacts: Contact[];
  deals: Deal[];
  leads: Lead[];
};

export default function ActivityForm({
  activity,
  contacts,
  deals,
  leads,
}: ActivityFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getInitialContactIds = (): string[] => {
    if (activity?.contactIds) {
      try {
        return JSON.parse(activity.contactIds);
      } catch {
        return [];
      }
    }
    if (activity?.contactId) {
      return [activity.contactId];
    }
    const paramContactId = searchParams.get("contactId");
    return paramContactId ? [paramContactId] : [];
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
  });

  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(getInitialContactIds());
  const [contactSearch, setContactSearch] = useState("");
  const [showContactDropdown, setShowContactDropdown] = useState(false);

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const selectedContacts = contacts.filter(c => selectedContactIds.includes(c.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const data = {
        type: formData.type as "call" | "meeting" | "email" | "task" | "whatsapp" | "visit" | "instagram",
        subject: formData.subject,
        description: formData.description || undefined,
        dueDate: formData.dueDate
          ? new Date(formData.dueDate + "T12:00:00")
          : null,
        completed: formData.completed,
        contactIds: selectedContactIds.length > 0 ? selectedContactIds : null,
        dealId: formData.dealId || null,
        leadId: formData.leadId || null,
      };

      if (activity) {
        await updateActivity(activity.id, data);
      } else {
        await createActivity(data);
      }

      router.push("/activities");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao salvar atividade"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const addContact = (contactId: string) => {
    if (!selectedContactIds.includes(contactId)) {
      setSelectedContactIds(prev => [...prev, contactId]);
    }
    setContactSearch("");
    setShowContactDropdown(false);
  };

  const removeContact = (contactId: string) => {
    setSelectedContactIds(prev => prev.filter(id => id !== contactId));
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

      <div>
        <label
          htmlFor="type"
          className="block text-sm font-medium text-gray-700"
        >
          Tipo *
        </label>
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
          <option value="instagram">📷 Direct Instagram</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="subject"
          className="block text-sm font-medium text-gray-700"
        >
          Assunto *
        </label>
        <input
          type="text"
          id="subject"
          required
          value={formData.subject}
          onChange={(e) =>
            setFormData({ ...formData, subject: e.target.value })
          }
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700"
        >
          Descrição
        </label>
        <textarea
          id="description"
          rows={4}
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
        />
      </div>

      <div>
        <label
          htmlFor="dueDate"
          className="block text-sm font-medium text-gray-700"
        >
          Data de Vencimento
        </label>
        <input
          type="date"
          id="dueDate"
          value={formData.dueDate}
          onChange={(e) =>
            setFormData({ ...formData, dueDate: e.target.value })
          }
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
        />
      </div>

      <div>
        <label
          htmlFor="dealId"
          className="block text-sm font-medium text-gray-700"
        >
          Negócio
        </label>
        <select
          id="dealId"
          value={formData.dealId}
          onChange={(e) => setFormData({ ...formData, dealId: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
        >
          <option value="">Nenhum negócio</option>
          {deals.map((deal) => (
            <option key={deal.id} value={deal.id}>
              {deal.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="leadId"
          className="block text-sm font-medium text-gray-700"
        >
          Lead
        </label>
        <select
          id="leadId"
          value={formData.leadId}
          onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
        >
          <option value="">Nenhum lead</option>
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.businessName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Contatos
        </label>

        {/* Selected contacts */}
        {selectedContacts.length > 0 && (
          <div className="mb-3 space-y-2">
            {selectedContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-md px-3 py-2"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-200">{contact.name}</p>
                  <p className="text-xs text-gray-400">{getCompanyName(contact)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeContact(contact.id)}
                  className="text-red-400 hover:text-red-300 ml-2"
                  title="Remover contato"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search input */}
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

          {/* Dropdown with filtered contacts */}
          {showContactDropdown && contactSearch && filteredContacts.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => addContact(contact.id)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  disabled={selectedContactIds.includes(contact.id)}
                >
                  <p className="text-sm font-medium text-gray-900">
                    {contact.name}
                    {selectedContactIds.includes(contact.id) && (
                      <span className="ml-2 text-xs text-green-600">✓ Selecionado</span>
                    )}
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

      <div className="flex items-center">
        <input
          type="checkbox"
          id="completed"
          checked={formData.completed}
          onChange={(e) =>
            setFormData({ ...formData, completed: e.target.checked })
          }
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
          {isSubmitting
            ? "Salvando..."
            : activity
              ? "Atualizar Atividade"
              : "Criar Atividade"}
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
