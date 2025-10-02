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
    legalName: string | null;
    website: string | null;
    phone: string | null;
    country: string | null;
    state: string | null;
    city: string | null;
    zipCode: string | null;
    streetAddress: string | null;
    industry: string | null;
    employeeCount: number | null;
    annualRevenue: number | null;
    taxId: string | null;
    description: string | null;
    instagram: string | null;
    linkedin: string | null;
    facebook: string | null;
    twitter: string | null;
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
        legalName: formData.get("legalName") as string,
        website: formData.get("website") as string,
        phone: formData.get("phone") as string,
        country: formData.get("country") as string,
        state: formData.get("state") as string,
        city: formData.get("city") as string,
        zipCode: formData.get("zipCode") as string,
        streetAddress: formData.get("streetAddress") as string,
        industry: formData.get("industry") as string,
        employeeCount: formData.get("employeeCount")
          ? parseInt(formData.get("employeeCount") as string)
          : undefined,
        annualRevenue: formData.get("annualRevenue")
          ? parseFloat(formData.get("annualRevenue") as string)
          : undefined,
        taxId: formData.get("taxId") as string,
        description: formData.get("description") as string,
        instagram: formData.get("instagram") as string,
        linkedin: formData.get("linkedin") as string,
        facebook: formData.get("facebook") as string,
        twitter: formData.get("twitter") as string,
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
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Informações Básicas
        </h3>

        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Nome Fantasia *
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
            htmlFor="legalName"
            className="block text-sm font-medium text-gray-700"
          >
            Razão Social
          </label>
          <input
            type="text"
            id="legalName"
            name="legalName"
            defaultValue={organization?.legalName || ""}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label
              htmlFor="website"
              className="block text-sm font-medium text-gray-700"
            >
              Website
            </label>
            <input
              type="url"
              id="website"
              name="website"
              placeholder="https://exemplo.com"
              defaultValue={organization?.website || ""}
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
        </div>
      </div>

      {/* Location */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Localização</h3>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label
              htmlFor="country"
              className="block text-sm font-medium text-gray-700"
            >
              País
            </label>
            <input
              type="text"
              id="country"
              name="country"
              defaultValue={organization?.country || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="state"
              className="block text-sm font-medium text-gray-700"
            >
              Estado
            </label>
            <input
              type="text"
              id="state"
              name="state"
              defaultValue={organization?.state || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="city"
              className="block text-sm font-medium text-gray-700"
            >
              Cidade
            </label>
            <input
              type="text"
              id="city"
              name="city"
              defaultValue={organization?.city || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="zipCode"
              className="block text-sm font-medium text-gray-700"
            >
              CEP
            </label>
            <input
              type="text"
              id="zipCode"
              name="zipCode"
              defaultValue={organization?.zipCode || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="streetAddress"
            className="block text-sm font-medium text-gray-700"
          >
            Endereço
          </label>
          <input
            type="text"
            id="streetAddress"
            name="streetAddress"
            defaultValue={organization?.streetAddress || ""}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Business Information */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Informações de Negócio
        </h3>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label
              htmlFor="industry"
              className="block text-sm font-medium text-gray-700"
            >
              Setor
            </label>
            <input
              type="text"
              id="industry"
              name="industry"
              placeholder="Ex: Tecnologia, Varejo, Saúde"
              defaultValue={organization?.industry || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="employeeCount"
              className="block text-sm font-medium text-gray-700"
            >
              Número de Funcionários
            </label>
            <input
              type="number"
              id="employeeCount"
              name="employeeCount"
              min="0"
              defaultValue={organization?.employeeCount || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="annualRevenue"
              className="block text-sm font-medium text-gray-700"
            >
              Receita Anual (R$)
            </label>
            <input
              type="number"
              id="annualRevenue"
              name="annualRevenue"
              min="0"
              step="0.01"
              defaultValue={organization?.annualRevenue || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="taxId"
              className="block text-sm font-medium text-gray-700"
            >
              CNPJ
            </label>
            <input
              type="text"
              id="taxId"
              name="taxId"
              defaultValue={organization?.taxId || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
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
            name="description"
            rows={3}
            defaultValue={organization?.description || ""}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Social Media */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Redes Sociais</h3>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label
              htmlFor="instagram"
              className="block text-sm font-medium text-gray-700"
            >
              Instagram
            </label>
            <input
              type="text"
              id="instagram"
              name="instagram"
              placeholder="@usuario"
              defaultValue={organization?.instagram || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="linkedin"
              className="block text-sm font-medium text-gray-700"
            >
              LinkedIn
            </label>
            <input
              type="text"
              id="linkedin"
              name="linkedin"
              placeholder="linkedin.com/company/..."
              defaultValue={organization?.linkedin || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="facebook"
              className="block text-sm font-medium text-gray-700"
            >
              Facebook
            </label>
            <input
              type="text"
              id="facebook"
              name="facebook"
              placeholder="facebook.com/..."
              defaultValue={organization?.facebook || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="twitter"
              className="block text-sm font-medium text-gray-700"
            >
              Twitter/X
            </label>
            <input
              type="text"
              id="twitter"
              name="twitter"
              placeholder="@usuario"
              defaultValue={organization?.twitter || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
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
