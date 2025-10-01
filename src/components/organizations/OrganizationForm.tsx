"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OrganizationFormData } from "@/lib/validations/organization";
import {
  createOrganization,
  updateOrganization,
} from "@/actions/organizations";

interface OrganizationFormProps {
  organization?: {
    id: string;
    name: string;
    domain: string | null;
    phone: string | null;
    address: string | null;
  };
}

export function OrganizationForm({ organization }: OrganizationFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const data: OrganizationFormData = {
        name: formData.get("name") as string,
        domain: formData.get("domain") as string,
        phone: formData.get("phone") as string,
        address: formData.get("address") as string,
      };

      if (organization) {
        await updateOrganization(organization.id, data);
      } else {
        await createOrganization(data);
      }

      router.push("/organizations");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao salvar organização"
      );
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

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Nome *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          defaultValue={organization?.name}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div>
        <label
          htmlFor="domain"
          className="block text-sm font-medium text-gray-700"
        >
          Domínio (website)
        </label>
        <input
          type="text"
          id="domain"
          name="domain"
          placeholder="exemplo.com"
          defaultValue={organization?.domain || ""}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div>
        <label
          htmlFor="phone"
          className="block text-sm font-medium text-gray-700"
        >
          Telefone
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          defaultValue={organization?.phone || ""}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div>
        <label
          htmlFor="address"
          className="block text-sm font-medium text-gray-700"
        >
          Endereço
        </label>
        <textarea
          id="address"
          name="address"
          rows={3}
          defaultValue={organization?.address || ""}
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
          {isLoading
            ? "Salvando..."
            : organization
              ? "Atualizar"
              : "Criar"}
        </button>
      </div>
    </form>
  );
}
