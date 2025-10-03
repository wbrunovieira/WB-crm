"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ContactFormData } from "@/lib/validations/contact";
import { createContact, updateContact } from "@/actions/contacts";
import { getOrganizationsList } from "@/actions/organizations-list";
import { getLeadContactsList } from "@/actions/leads-list";
import { departments, contactSources, contactStatuses } from "@/lib/lists/departments-list";

interface ContactFormProps {
  contact?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    role: string | null;
    department: string | null;
    organizationId: string | null;
    linkedin: string | null;
    status: string;
    isPrimary: boolean;
    birthDate: Date | null;
    notes: string | null;
    preferredLanguage: string | null;
    source: string | null;
    sourceLeadContactId: string | null;
  };
  leadId?: string; // Optional: pre-select a lead when creating from lead page
}

export function ContactForm({ contact, leadId }: ContactFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [organizations, setOrganizations] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [leadContacts, setLeadContacts] = useState<
    Array<{ id: string; name: string; role: string | null }>
  >([]);
  const [selectedLeadContact, setSelectedLeadContact] = useState(
    contact?.sourceLeadContactId || ""
  );

  useEffect(() => {
    getOrganizationsList().then(setOrganizations);
  }, []);

  useEffect(() => {
    if (leadId) {
      getLeadContactsList(leadId).then(setLeadContacts);
    }
  }, [leadId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const data: ContactFormData = {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        whatsapp: formData.get("whatsapp") as string,
        role: formData.get("role") as string,
        department: formData.get("department") as string,
        organizationId: formData.get("organizationId") as string,
        linkedin: formData.get("linkedin") as string,
        status: formData.get("status") as "active" | "inactive" | "bounced" | undefined,
        isPrimary: formData.get("isPrimary") === "on",
        birthDate: formData.get("birthDate") as string,
        notes: formData.get("notes") as string,
        preferredLanguage: formData.get("preferredLanguage") as string,
        source: formData.get("source") as string,
        sourceLeadContactId: formData.get("sourceLeadContactId") as string,
      };

      if (contact) {
        await updateContact(contact.id, data);
      } else {
        await createContact(data);
      }

      router.push("/contacts");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar contato");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Informações Básicas */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Informações Básicas</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nome *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              defaultValue={contact?.name}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              defaultValue={contact?.email || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Telefone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              defaultValue={contact?.phone || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">
              WhatsApp
            </label>
            <input
              type="tel"
              id="whatsapp"
              name="whatsapp"
              defaultValue={contact?.whatsapp || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Vinculação com Lead (opcional) */}
      {leadId && (
        <div className="border-b pb-4 bg-blue-50 p-4 rounded-md">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Vincular com Lead Contact
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Este contato está sendo criado a partir de um Lead. Você pode vinculá-lo a um Lead Contact existente.
          </p>

          <div>
            <label htmlFor="sourceLeadContactId" className="block text-sm font-medium text-gray-700">
              Lead Contact de Origem (Opcional)
            </label>
            <select
              id="sourceLeadContactId"
              name="sourceLeadContactId"
              value={selectedLeadContact}
              onChange={(e) => setSelectedLeadContact(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Nenhum</option>
              {leadContacts.map((lc) => (
                <option key={lc.id} value={lc.id}>
                  {lc.name} {lc.role ? `- ${lc.role}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Informações Profissionais */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Informações Profissionais</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Cargo
            </label>
            <input
              type="text"
              id="role"
              name="role"
              defaultValue={contact?.role || ""}
              placeholder="Ex: Gerente de Vendas"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700">
              Departamento
            </label>
            <select
              id="department"
              name="department"
              defaultValue={contact?.department || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Selecione...</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="organizationId" className="block text-sm font-medium text-gray-700">
              Organização
            </label>
            <select
              id="organizationId"
              name="organizationId"
              defaultValue={contact?.organizationId || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Nenhuma</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700">
              LinkedIn
            </label>
            <input
              type="url"
              id="linkedin"
              name="linkedin"
              defaultValue={contact?.linkedin || ""}
              placeholder="https://linkedin.com/in/..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Status e Configurações */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Status e Configurações</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={contact?.status || "active"}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {contactStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="source" className="block text-sm font-medium text-gray-700">
              Origem
            </label>
            <select
              id="source"
              name="source"
              defaultValue={contact?.source || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Selecione...</option>
              {contactSources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="preferredLanguage" className="block text-sm font-medium text-gray-700">
              Idioma Preferencial
            </label>
            <select
              id="preferredLanguage"
              name="preferredLanguage"
              defaultValue={contact?.preferredLanguage || "pt-BR"}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="pt-BR">Português (BR)</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>

          <div>
            <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
              Data de Nascimento
            </label>
            <input
              type="date"
              id="birthDate"
              name="birthDate"
              defaultValue={contact?.birthDate ? new Date(contact.birthDate).toISOString().split('T')[0] : ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPrimary"
              name="isPrimary"
              defaultChecked={contact?.isPrimary || false}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="isPrimary" className="ml-2 block text-sm text-gray-900">
              Contato Principal da Organização
            </label>
          </div>
        </div>
      </div>

      {/* Observações */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Observações
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={contact?.notes || ""}
          placeholder="Adicione observações sobre este contato..."
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md bg-primary px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? "Salvando..." : contact ? "Atualizar" : "Criar"}
        </button>
      </div>
    </form>
  );
}
