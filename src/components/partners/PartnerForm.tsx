"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPartner, updatePartner } from "@/actions/partners";
import { partnerTypes } from "@/lib/lists/partner-types";
import { companySizes } from "@/lib/lists/company-sizes";
import { countries } from "@/lib/lists/countries";
import { brazilianStates } from "@/lib/lists/brazilian-states";

interface PartnerFormProps {
  partner?: {
    id: string;
    name: string;
    legalName: string | null;
    foundationDate: Date | null;
    partnerType: string;
    website: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    country: string | null;
    state: string | null;
    city: string | null;
    zipCode: string | null;
    streetAddress: string | null;
    linkedin: string | null;
    instagram: string | null;
    facebook: string | null;
    twitter: string | null;
    industry: string | null;
    employeeCount: number | null;
    companySize: string | null;
    description: string | null;
    expertise: string | null;
    notes: string | null;
  };
}

export function PartnerForm({ partner }: PartnerFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>(partner?.country || "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const employeeCountStr = formData.get("employeeCount") as string;

    const data = {
      name: formData.get("name") as string,
      legalName: formData.get("legalName") as string,
      foundationDate: formData.get("foundationDate") as string,
      partnerType: formData.get("partnerType") as string,
      website: formData.get("website") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      whatsapp: formData.get("whatsapp") as string,
      country: formData.get("country") as string,
      state: formData.get("state") as string,
      city: formData.get("city") as string,
      zipCode: formData.get("zipCode") as string,
      streetAddress: formData.get("streetAddress") as string,
      linkedin: formData.get("linkedin") as string,
      instagram: formData.get("instagram") as string,
      facebook: formData.get("facebook") as string,
      twitter: formData.get("twitter") as string,
      industry: formData.get("industry") as string,
      employeeCount: employeeCountStr ? parseInt(employeeCountStr) : undefined,
      companySize: formData.get("companySize") as string,
      description: formData.get("description") as string,
      expertise: formData.get("expertise") as string,
      notes: formData.get("notes") as string,
    };

    try {
      if (partner) {
        await updatePartner(partner.id, data);
      } else {
        await createPartner(data);
      }
      router.push("/partners");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar parceiro");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Informações Básicas */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Informações Básicas</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nome da Empresa *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              defaultValue={partner?.name}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="legalName" className="block text-sm font-medium text-gray-700">
              Razão Social
            </label>
            <input
              type="text"
              id="legalName"
              name="legalName"
              defaultValue={partner?.legalName || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="partnerType" className="block text-sm font-medium text-gray-700">
              Tipo de Parceria *
            </label>
            <select
              id="partnerType"
              name="partnerType"
              required
              defaultValue={partner?.partnerType}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Selecione...</option>
              {partnerTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
              Setor
            </label>
            <input
              type="text"
              id="industry"
              name="industry"
              defaultValue={partner?.industry || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="foundationDate" className="block text-sm font-medium text-gray-700">
              Data de Fundação
            </label>
            <input
              type="date"
              id="foundationDate"
              name="foundationDate"
              defaultValue={
                partner?.foundationDate
                  ? new Date(partner.foundationDate).toISOString().split("T")[0]
                  : ""
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="employeeCount" className="block text-sm font-medium text-gray-700">
              Número de Funcionários
            </label>
            <input
              type="number"
              id="employeeCount"
              name="employeeCount"
              defaultValue={partner?.employeeCount || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="companySize" className="block text-sm font-medium text-gray-700">
              Porte da Empresa
            </label>
            <select
              id="companySize"
              name="companySize"
              defaultValue={partner?.companySize || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Selecione...</option>
              {companySizes.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Contato */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Informações de Contato</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700">
              Website
            </label>
            <input
              type="text"
              id="website"
              name="website"
              placeholder="www.exemplo.com.br ou https://exemplo.com.br"
              defaultValue={partner?.website || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
              defaultValue={partner?.email || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
              defaultValue={partner?.phone || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
              defaultValue={partner?.whatsapp || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Localização */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Localização</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="streetAddress" className="block text-sm font-medium text-gray-700">
              Endereço
            </label>
            <input
              type="text"
              id="streetAddress"
              name="streetAddress"
              defaultValue={partner?.streetAddress || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
              Cidade
            </label>
            <input
              type="text"
              id="city"
              name="city"
              defaultValue={partner?.city || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
              CEP
            </label>
            <input
              type="text"
              id="zipCode"
              name="zipCode"
              defaultValue={partner?.zipCode || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700">
              País
            </label>
            <select
              id="country"
              name="country"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Selecione...</option>
              {countries.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700">
              {selectedCountry === "BR" ? "Estado" : "Estado/Província/Região"}
            </label>
            {selectedCountry === "BR" ? (
              <select
                id="state"
                name="state"
                defaultValue={partner?.state || ""}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Selecione...</option>
                {brazilianStates.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                id="state"
                name="state"
                defaultValue={partner?.state || ""}
                placeholder="Digite o estado, província ou região"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            )}
          </div>
        </div>
      </div>

      {/* Redes Sociais */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Redes Sociais</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700">
              LinkedIn
            </label>
            <input
              type="text"
              id="linkedin"
              name="linkedin"
              placeholder="linkedin.com/company/... ou https://linkedin.com/company/..."
              defaultValue={partner?.linkedin || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="instagram" className="block text-sm font-medium text-gray-700">
              Instagram
            </label>
            <input
              type="text"
              id="instagram"
              name="instagram"
              placeholder="@empresa"
              defaultValue={partner?.instagram || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="facebook" className="block text-sm font-medium text-gray-700">
              Facebook
            </label>
            <input
              type="text"
              id="facebook"
              name="facebook"
              defaultValue={partner?.facebook || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="twitter" className="block text-sm font-medium text-gray-700">
              Twitter/X
            </label>
            <input
              type="text"
              id="twitter"
              name="twitter"
              defaultValue={partner?.twitter || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Informações Adicionais */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Informações Adicionais</h3>
        <div className="space-y-6">
          <div>
            <label htmlFor="expertise" className="block text-sm font-medium text-gray-700">
              Área de Expertise/Especialização
            </label>
            <input
              type="text"
              id="expertise"
              name="expertise"
              placeholder="Ex: Desenvolvimento de Software, Marketing Digital, etc."
              defaultValue={partner?.expertise || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Descrição
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={partner?.description || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Observações Internas
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={partner?.notes || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-4 pt-6 border-t">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-white hover:bg-purple-700 disabled:bg-gray-400"
        >
          {loading ? "Salvando..." : partner ? "Atualizar Parceiro" : "Criar Parceiro"}
        </button>
      </div>
    </form>
  );
}
