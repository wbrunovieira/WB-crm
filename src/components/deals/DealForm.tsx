"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDeal, updateDeal } from "@/actions/deals";

type Contact = {
  id: string;
  name: string;
};

type Organization = {
  id: string;
  name: string;
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
  value: number;
  currency: string;
  status: string;
  contactId: string | null;
  organizationId: string | null;
  stageId: string;
  expectedCloseDate: Date | null;
};

type DealFormProps = {
  deal?: Deal;
  contacts: Contact[];
  organizations: Organization[];
  stages: Stage[];
};

export default function DealForm({
  deal,
  contacts,
  organizations,
  stages,
}: DealFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: deal?.title || "",
    value: deal?.value || 0,
    currency: deal?.currency || "BRL",
    status: deal?.status || "open",
    contactId: deal?.contactId || "",
    organizationId: deal?.organizationId || "",
    stageId: deal?.stageId || "",
    expectedCloseDate: deal?.expectedCloseDate
      ? new Date(deal.expectedCloseDate).toISOString().split("T")[0]
      : "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const data = {
        title: formData.title,
        value: Number(formData.value),
        currency: formData.currency,
        status: formData.status as "open" | "won" | "lost",
        contactId: formData.contactId || null,
        organizationId: formData.organizationId || null,
        stageId: formData.stageId,
        expectedCloseDate: formData.expectedCloseDate
          ? new Date(formData.expectedCloseDate)
          : null,
      };

      if (deal) {
        await updateDeal(deal.id, data);
      } else {
        await createDeal(data);
      }

      router.push("/deals");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao salvar negócio"
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
          htmlFor="title"
          className="block text-sm font-medium text-gray-700"
        >
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="value"
            className="block text-sm font-medium text-gray-700"
          >
            Valor *
          </label>
          <input
            type="number"
            id="value"
            required
            min="0"
            step="0.01"
            value={formData.value}
            onChange={(e) =>
              setFormData({ ...formData, value: Number(e.target.value) })
            }
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
          />
        </div>

        <div>
          <label
            htmlFor="currency"
            className="block text-sm font-medium text-gray-700"
          >
            Moeda
          </label>
          <select
            id="currency"
            value={formData.currency}
            onChange={(e) =>
              setFormData({ ...formData, currency: e.target.value })
            }
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
          >
            <option value="BRL">BRL - Real</option>
            <option value="USD">USD - Dólar</option>
            <option value="EUR">EUR - Euro</option>
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="stageId"
          className="block text-sm font-medium text-gray-700"
        >
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
        <label
          htmlFor="status"
          className="block text-sm font-medium text-gray-700"
        >
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

      <div>
        <label
          htmlFor="organizationId"
          className="block text-sm font-medium text-gray-700"
        >
          Organização
        </label>
        <select
          id="organizationId"
          value={formData.organizationId}
          onChange={(e) =>
            setFormData({ ...formData, organizationId: e.target.value })
          }
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
        >
          <option value="">Nenhuma organização</option>
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="expectedCloseDate"
          className="block text-sm font-medium text-gray-700"
        >
          Data Prevista de Fechamento
        </label>
        <input
          type="date"
          id="expectedCloseDate"
          value={formData.expectedCloseDate}
          onChange={(e) =>
            setFormData({ ...formData, expectedCloseDate: e.target.value })
          }
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
        />
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {isSubmitting
            ? "Salvando..."
            : deal
              ? "Atualizar Negócio"
              : "Criar Negócio"}
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
