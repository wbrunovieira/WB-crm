"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createActivity } from "@/actions/activities";
import { toast } from "sonner";
import { X, Calendar, Clock } from "lucide-react";

interface ScheduleNextActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  previousActivity: {
    type?: string;
    subject?: string;
    description?: string | null;
    dealId?: string | null;
    dealTitle?: string;
    contactId?: string | null;
    contactName?: string;
    contactIds?: string | null;
    leadId?: string | null;
    leadName?: string;
    partnerId?: string | null;
    partnerName?: string;
  };
  availableData: {
    deals: Array<{ id: string; title: string }>;
    contacts: Array<{ id: string; name: string }>;
    leads: Array<{ id: string; businessName: string }>;
    partners: Array<{ id: string; name: string }>;
  };
}

export function ScheduleNextActivityModal({
  isOpen,
  onClose,
  previousActivity,
  availableData,
}: ScheduleNextActivityModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse contactIds if it's a JSON string
  const getInitialContactIds = () => {
    if (previousActivity.contactIds) {
      try {
        const parsed = JSON.parse(previousActivity.contactIds);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return previousActivity.contactId ? [previousActivity.contactId] : [];
  };

  const [formData, setFormData] = useState({
    type: previousActivity.type || "call",
    subject: `Follow-up: ${previousActivity.subject || ""}`,
    description: previousActivity.description || "",
    dueDate: "",
    dueTime: "",
    dealId: previousActivity.dealId || "",
    contactIds: getInitialContactIds(),
    leadId: previousActivity.leadId || "",
    partnerId: previousActivity.partnerId || "",
    linkType: previousActivity.dealId
      ? "deal"
      : previousActivity.leadId
        ? "lead"
        : previousActivity.partnerId
          ? "partner"
          : "contact",
  });

  useEffect(() => {
    if (isOpen) {
      // Parse contactIds if it's a JSON string
      const initialContactIds = (() => {
        if (previousActivity.contactIds) {
          try {
            const parsed = JSON.parse(previousActivity.contactIds);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return previousActivity.contactId ? [previousActivity.contactId] : [];
      })();

      // Reset form with previous activity data when modal opens
      setFormData({
        type: previousActivity.type || "call",
        subject: `Follow-up: ${previousActivity.subject || ""}`,
        description: previousActivity.description || "",
        dueDate: "",
        dueTime: "",
        dealId: previousActivity.dealId || "",
        contactIds: initialContactIds,
        leadId: previousActivity.leadId || "",
        partnerId: previousActivity.partnerId || "",
        linkType: previousActivity.dealId
          ? "deal"
          : previousActivity.leadId
            ? "lead"
            : previousActivity.partnerId
              ? "partner"
              : "contact",
      });
    }
  }, [isOpen, previousActivity]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Combine date and time
      const dueDateTime = formData.dueDate && formData.dueTime
        ? new Date(`${formData.dueDate}T${formData.dueTime}`)
        : null;

      await createActivity({
        type: formData.type as "call" | "meeting" | "email" | "task" | "whatsapp" | "visit" | "instagram" | "linkedin",
        subject: formData.subject,
        description: formData.description || undefined,
        dueDate: dueDateTime,
        completed: false,
        dealId: formData.linkType === "deal" ? formData.dealId || null : null,
        contactIds: formData.linkType === "contact" ? formData.contactIds : [],
        leadId: formData.linkType === "lead" ? formData.leadId || null : null,
        partnerId: formData.linkType === "partner" ? formData.partnerId || null : null,
      });

      toast.success("Próxima atividade agendada com sucesso!");
      router.refresh();
      onClose();
    } catch (error) {
      console.error("Error creating activity:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao agendar atividade");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactToggle = (contactId: string) => {
    setFormData(prev => ({
      ...prev,
      contactIds: prev.contactIds.includes(contactId)
        ? prev.contactIds.filter(id => id !== contactId)
        : [...prev.contactIds, contactId]
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Agendar Próxima Atividade
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Configure o follow-up desta atividade
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Activity Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Atividade *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            >
              <option value="call">📞 Ligação</option>
              <option value="meeting">📅 Reunião</option>
              <option value="email">✉️ E-mail</option>
              <option value="task">📋 Tarefa</option>
              <option value="whatsapp">💬 WhatsApp</option>
              <option value="visit">📍 Visita Presencial</option>
              <option value="instagram">📷 Instagram</option>
              <option value="linkedin">💼 LinkedIn</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assunto *
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Ex: Follow-up da reunião"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalhes adicionais..."
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Data
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                Hora
              </label>
              <input
                type="time"
                value={formData.dueTime}
                onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Link Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vincular a
            </label>
            <div className="grid grid-cols-4 gap-2">
              {["deal", "contact", "lead", "partner"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, linkType: type })}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    formData.linkType === type
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {type === "deal" ? "Negócio" : type === "contact" ? "Contato" : type === "lead" ? "Lead" : "Parceiro"}
                </button>
              ))}
            </div>
          </div>

          {/* Deal Selection */}
          {formData.linkType === "deal" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Negócio
              </label>
              <select
                value={formData.dealId}
                onChange={(e) => setFormData({ ...formData, dealId: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Selecione um negócio</option>
                {availableData.deals.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Contact Selection (Multiple) */}
          {formData.linkType === "contact" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contatos (múltipla seleção)
              </label>
              <div className="max-h-48 overflow-y-auto rounded-md border border-gray-300 p-2 space-y-1">
                {availableData.contacts.map((contact) => (
                  <label
                    key={contact.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.contactIds.includes(contact.id)}
                      onChange={() => handleContactToggle(contact.id)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm">{contact.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Lead Selection */}
          {formData.linkType === "lead" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lead
              </label>
              <select
                value={formData.leadId}
                onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Selecione um lead</option>
                {availableData.leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.businessName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Partner Selection */}
          {formData.linkType === "partner" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parceiro
              </label>
              <select
                value={formData.partnerId}
                onChange={(e) => setFormData({ ...formData, partnerId: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Selecione um parceiro</option>
                {availableData.partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Pular
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Agendando..." : "Agendar Atividade"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
