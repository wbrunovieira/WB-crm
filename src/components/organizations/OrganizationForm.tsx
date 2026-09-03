"use client";

import { useState } from "react";
import { normalizeCNPJ, validateCNPJ } from "@/lib/validations/cnpj";
import { useRouter } from "next/navigation";
import { OrganizationFormData } from "@/lib/validations/organization";
import { useCreateOrganization, useUpdateOrganization } from "@/hooks/organizations/use-organizations";
import { MultiLabelSelect } from "@/components/shared/MultiLabelSelect";
import { CNAEAutocomplete } from "@/components/shared/CNAEAutocomplete";
import { LanguageSelector, type LanguageEntry } from "@/components/shared/LanguageSelector";
import { companySizes } from "@/lib/lists/company-sizes";
import { countries } from "@/lib/lists/countries";
import { brazilianStates } from "@/lib/lists/brazilian-states";

interface OrganizationFormProps {
  organization?: {
    id: string;
    name: string;
    legalName: string | null;
    foundationDate: Date | string | null;
    website: string | null;
    phone: string | null;
    phone2: string | null;
    whatsapp: string | null;
    email: string | null;
    segment: string | null;
    legalNature: string | null;
    branchType: string | null;
    simplesNacional: boolean | null;
    isMei: boolean | null;
    revenueRange: string | null;
    sourceGroup: string | null;
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
    companyOwner: string | null;
    companySize: string | null;
    instagram: string | null;
    linkedin: string | null;
    facebook: string | null;
    twitter: string | null;
    tiktok: string | null;
    labels?: { id: string; name: string; color: string }[];
    primaryCNAEId: string | null;
    internationalActivity: string | null;
    primaryCNAE?: {
      id: string;
      code: string;
      description: string;
    } | null;
    commLanguage?: string | null;
    // Hosting fields
    hasHosting: boolean;
    hostingRenewalDate: Date | string | null;
    hostingPlan: string | null;
    hostingValue: number | null;
    hostingReminderDays: number;
    hostingNotes: string | null;
    languages?: string | null;
  };
}

export function OrganizationForm({ organization }: OrganizationFormProps) {
  const router = useRouter();
  const createMutation = useCreateOrganization();
  const updateMutation = useUpdateOrganization();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [labelIds, setLabelIds] = useState<string[]>(organization?.labels?.map(l => l.id) || []);
  const [selectedCountry, setSelectedCountry] = useState<string>(organization?.country || "");
  const [primaryCNAE, setPrimaryCNAE] = useState<{ id: string; code: string; description: string } | null>(
    organization?.primaryCNAE || null
  );
  const [hasHosting, setHasHosting] = useState(organization?.hasHosting || false);
  const [orgLanguages, setOrgLanguages] = useState<LanguageEntry[]>(() => {
    if (organization?.languages) {
      try { return JSON.parse(organization.languages); } catch { return []; }
    }
    return [];
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);

      // Mesmo helper do LeadForm: campo apagado precisa virar null, não "". Enviar a string
      // crua gravava vazio no banco em vez de limpar o dado.
      const getString = (key: string): string | null | undefined => {
        const value = formData.get(key);
        if (value === null) return undefined;
        return value !== "" ? (value as string) : null;
      };

      const data: OrganizationFormData = {
        name: formData.get("name") as string,
        legalName: getString("legalName"),
        foundationDate: getString("foundationDate"),
        website: getString("website"),
        phone: getString("phone"),
        whatsapp: getString("whatsapp"),
        email: getString("email"),
        country: getString("country"),
        state: getString("state"),
        city: getString("city"),
        zipCode: getString("zipCode"),
        streetAddress: getString("streetAddress"),
        industry: getString("industry"),
        employeeCount: formData.get("employeeCount")
          ? parseInt(formData.get("employeeCount") as string)
          : undefined,
        annualRevenue: formData.get("annualRevenue")
          ? parseFloat(formData.get("annualRevenue") as string)
          : undefined,
        taxId: getString("taxId") ? normalizeCNPJ(getString("taxId")!) : getString("taxId"),
        description: getString("description"),
        companyOwner: getString("companyOwner"),
        companySize: getString("companySize"),
        // Cadastrais/fiscais que vêm do lead na conversão — o backend já aceitava, o form
        // é que não os expunha, então o dado chegava e ficava invisível e não editável.
        segment: getString("segment"),
        legalNature: getString("legalNature"),
        branchType: getString("branchType"),
        simplesNacional: formData.get("simplesNacional") === "on",
        isMei: formData.get("isMei") === "on",
        revenueRange: getString("revenueRange"),
        phone2: getString("phone2"),
        sourceGroup: getString("sourceGroup"),
        primaryCNAEId: primaryCNAE?.id || undefined,
        internationalActivity: getString("internationalActivity"),
        commLanguage: (formData.get("commLanguage") as string) || "pt",
        instagram: getString("instagram"),
        linkedin: getString("linkedin"),
        facebook: getString("facebook"),
        twitter: getString("twitter"),
        tiktok: getString("tiktok"),
        languages: orgLanguages.length > 0 ? orgLanguages : null,
        // Hosting
        hasHosting: hasHosting,
        hostingRenewalDate: getString("hostingRenewalDate"),
        hostingPlan: getString("hostingPlan"),
        hostingValue: formData.get("hostingValue")
          ? parseFloat(formData.get("hostingValue") as string)
          : undefined,
        hostingReminderDays: formData.get("hostingReminderDays")
          ? parseInt(formData.get("hostingReminderDays") as string)
          : undefined,
        hostingNotes: getString("hostingNotes"),
      };

      // Mesma validação do lead: sem isso a organização aceitava qualquer string como CNPJ,
      // e o mesmo CNPJ virava duas coisas diferentes conforme a origem do registro.
      if (data.taxId && !validateCNPJ(data.taxId)) {
        // Usa o mesmo mecanismo de erro que o resto deste form (banner inline), não o toast
        // do LeadForm — padronizar os dois é outro item (#1194).
        setError("CNPJ inválido. Verifique os dígitos verificadores ou deixe o campo em branco.");
        setIsLoading(false);
        return;
      }

      if (organization) {
        await updateMutation.mutateAsync({ id: organization.id, ...data, labelIds });
      } else {
        await createMutation.mutateAsync({ ...data, labelIds });
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Labels
          </label>
          <MultiLabelSelect
            value={labelIds}
            onChange={setLabelIds}
            placeholder="Selecione ou crie labels..."
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

        <div>
          <label
            htmlFor="foundationDate"
            className="block text-sm font-medium text-gray-700"
          >
            Data de Fundação
          </label>
          <input
            type="date"
            id="foundationDate"
            name="foundationDate"
            defaultValue={organization?.foundationDate ? new Date(organization.foundationDate).toISOString().split('T')[0] : ""}
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
              type="text"
              id="website"
              name="website"
              placeholder="www.exemplo.com.br ou https://exemplo.com.br"
              defaultValue={organization?.website || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="contato@empresa.com"
              defaultValue={organization?.email || ""}
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
            <label htmlFor="phone2" className="block text-sm font-medium text-gray-700">
              Telefone 2
            </label>
            <input
              type="tel"
              id="phone2"
              name="phone2"
              defaultValue={organization?.phone2 || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="whatsapp"
              className="block text-sm font-medium text-gray-700"
            >
              WhatsApp
            </label>
            <input
              type="tel"
              id="whatsapp"
              name="whatsapp"
              defaultValue={organization?.whatsapp || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="commLanguage"
              className="block text-sm font-medium text-gray-700"
            >
              Idioma de comunicação (e-mail)
            </label>
            <select
              id="commLanguage"
              name="commLanguage"
              defaultValue={organization?.commLanguage ?? "pt"}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="pt">Português</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="it">Italiano</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Idioma em que campanhas e newsletters são enviadas (diferente de &quot;Idiomas falados&quot;)
            </p>
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
            <select
              id="country"
              name="country"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
            <label
              htmlFor="state"
              className="block text-sm font-medium text-gray-700"
            >
              {selectedCountry === "BR" ? "Estado" : "Estado/Província/Região"}
            </label>
            {selectedCountry === "BR" ? (
              <select
                id="state"
                name="state"
                defaultValue={organization?.state || ""}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                defaultValue={organization?.state || ""}
                placeholder="Digite o estado, província ou região"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            )}
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

          <div>
            <label
              htmlFor="companyOwner"
              className="block text-sm font-medium text-gray-700"
            >
              Proprietário da Empresa
            </label>
            <input
              type="text"
              id="companyOwner"
              name="companyOwner"
              placeholder="Nome do proprietário"
              defaultValue={organization?.companyOwner || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="companySize"
              className="block text-sm font-medium text-gray-700"
            >
              Porte da Empresa
            </label>
            <select
              id="companySize"
              name="companySize"
              defaultValue={organization?.companySize || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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

        {/* Cadastrais/fiscais — mesmos campos e rótulos do LeadForm, para o dado herdado na
            conversão continuar visível e editável na conta do cliente. */}
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="segment" className="mb-2 block text-sm font-medium text-gray-700">
              Segmento Comercial
            </label>
            <input
              type="text"
              id="segment"
              name="segment"
              defaultValue={organization?.segment ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="legalNature" className="mb-2 block text-sm font-medium text-gray-700">
              Natureza Jurídica
            </label>
            <input
              type="text"
              id="legalNature"
              name="legalNature"
              defaultValue={organization?.legalNature ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="branchType" className="mb-2 block text-sm font-medium text-gray-700">
              Tipo de Filial
            </label>
            <select
              id="branchType"
              name="branchType"
              defaultValue={organization?.branchType ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {/* Mesmos valores gravados pelo LeadForm — em minúsculo, o dado convertido do
                  lead ("Matriz") não casaria e o select abriria vazio. */}
              <option value="">Não informado</option>
              <option value="Matriz">Matriz</option>
              <option value="Filial">Filial</option>
            </select>
          </div>
          <div>
            <label htmlFor="revenueRange" className="mb-2 block text-sm font-medium text-gray-700">
              Faixa de Faturamento
            </label>
            <input
              type="text"
              id="revenueRange"
              name="revenueRange"
              defaultValue={organization?.revenueRange ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="sourceGroup" className="mb-2 block text-sm font-medium text-gray-700">
              Lote / Grupo
            </label>
            <input
              type="text"
              id="sourceGroup"
              name="sourceGroup"
              defaultValue={organization?.sourceGroup ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-end gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="simplesNacional"
                defaultChecked={organization?.simplesNacional ?? false}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              Simples Nacional
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="isMei"
                defaultChecked={organization?.isMei ?? false}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              MEI
            </label>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <CNAEAutocomplete
              value={primaryCNAE}
              onChange={setPrimaryCNAE}
              label="Atividade Primária (CNAE) - Empresas Brasileiras"
              placeholder="Digite código ou descrição do CNAE..."
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="internationalActivity"
              className="block text-sm font-medium text-gray-700"
            >
              Atividade Internacional (Empresas Estrangeiras)
            </label>
            <input
              type="text"
              id="internationalActivity"
              name="internationalActivity"
              placeholder="Ex: Software Development, Digital Marketing, E-commerce..."
              defaultValue={organization?.internationalActivity || ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-gray-500">
              Use este campo para empresas não-brasileiras ou se não encontrar o CNAE adequado
            </p>
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

      {/* Hosting */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Hospedagem</h3>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="hasHosting"
            checked={hasHosting}
            onChange={(e) => setHasHosting(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="hasHosting" className="text-sm font-medium text-gray-700">
            Cliente possui hospedagem conosco
          </label>
        </div>

        {hasHosting && (
          <div className="grid gap-6 md:grid-cols-2 pl-7">
            <div>
              <label
                htmlFor="hostingRenewalDate"
                className="block text-sm font-medium text-gray-700"
              >
                Data de Vencimento *
              </label>
              <input
                type="date"
                id="hostingRenewalDate"
                name="hostingRenewalDate"
                required={hasHosting}
                defaultValue={organization?.hostingRenewalDate ? new Date(organization.hostingRenewalDate).toISOString().split('T')[0] : ""}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label
                htmlFor="hostingPlan"
                className="block text-sm font-medium text-gray-700"
              >
                Plano
              </label>
              <select
                id="hostingPlan"
                name="hostingPlan"
                defaultValue={organization?.hostingPlan || ""}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Selecione...</option>
                <option value="Básico">Básico</option>
                <option value="Profissional">Profissional</option>
                <option value="Enterprise">Enterprise</option>
                <option value="Personalizado">Personalizado</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="hostingValue"
                className="block text-sm font-medium text-gray-700"
              >
                Valor Anual (R$)
              </label>
              <input
                type="number"
                id="hostingValue"
                name="hostingValue"
                min="0"
                step="0.01"
                defaultValue={organization?.hostingValue || ""}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label
                htmlFor="hostingReminderDays"
                className="block text-sm font-medium text-gray-700"
              >
                Lembrar com Antecedência (dias)
              </label>
              <select
                id="hostingReminderDays"
                name="hostingReminderDays"
                defaultValue={organization?.hostingReminderDays || 30}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="7">7 dias</option>
                <option value="15">15 dias</option>
                <option value="30">30 dias</option>
                <option value="45">45 dias</option>
                <option value="60">60 dias</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="hostingNotes"
                className="block text-sm font-medium text-gray-700"
              >
                Observações
              </label>
              <textarea
                id="hostingNotes"
                name="hostingNotes"
                rows={2}
                placeholder="Ex: Renovação automática, contato financeiro@empresa.com"
                defaultValue={organization?.hostingNotes || ""}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        )}
      </div>

      {/* Languages */}
      <div className="space-y-6">
        <LanguageSelector value={orgLanguages} onChange={setOrgLanguages} />
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

          <div>
            <label
              htmlFor="tiktok"
              className="block text-sm font-medium text-gray-700"
            >
              TikTok
            </label>
            <input
              type="text"
              id="tiktok"
              name="tiktok"
              placeholder="@usuario"
              defaultValue={organization?.tiktok || ""}
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
          className="rounded-md bg-primary px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
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
