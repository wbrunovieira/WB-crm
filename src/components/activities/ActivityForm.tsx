"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createActivity, updateActivity } from "@/actions/activities";

type Contact = {
  id: string;
  name: string;
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

  const [formData, setFormData] = useState({
    type: activity?.type || "task",
    subject: activity?.subject || "",
    description: activity?.description || "",
    dueDate: activity?.dueDate
      ? new Date(activity.dueDate).toISOString().split("T")[0]
      : "",
    completed: activity?.completed || false,
    contactId: activity?.contactId || searchParams.get("contactId") || "",
    dealId: activity?.dealId || searchParams.get("dealId") || "",
    leadId: activity?.leadId || searchParams.get("leadId") || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const data = {
        type: formData.type as "call" | "meeting" | "email" | "task" | "whatsapp" | "visit" | "instagram",
        subject: formData.subject,
        description: formData.description || undefined,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
        completed: formData.completed,
        contactId: formData.contactId || null,
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
        <label
          htmlFor="contactId"
          className="block text-sm font-medium text-gray-700"
        >
          Contato
        </label>
        <select
          id="contactId"
          value={formData.contactId}
          onChange={(e) =>
            setFormData({ ...formData, contactId: e.target.value })
          }
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
        >
          <option value="">Nenhum contato</option>
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name}
            </option>
          ))}
        </select>
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
