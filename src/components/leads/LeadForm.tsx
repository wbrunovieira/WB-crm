"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createLead, updateLead } from "@/actions/leads";
import { useState } from "react";
import { LabelSelect } from "@/components/shared/LabelSelect";
import { companySizes } from "@/lib/lists/company-sizes";
import { countries } from "@/lib/lists/countries";

type Lead = {
  id?: string;
  googleId?: string | null;
  businessName: string;
  registeredName?: string | null;
  foundationDate?: Date | null;
  companyRegistrationID?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zipCode?: string | null;
  vicinity?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  email?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  tiktok?: string | null;
  categories?: string | null;
  rating?: number | null;
  priceLevel?: number | null;
  userRatingsTotal?: number | null;
  permanentlyClosed?: boolean;
  types?: string | null;
  companyOwner?: string | null;
  companySize?: string | null;
  revenue?: number | null;
  employeesCount?: number | null;
  description?: string | null;
  equityCapital?: number | null;
  businessStatus?: string | null;
  primaryActivity?: string | null;
  secondaryActivities?: string | null;
  source?: string | null;
  quality?: string | null;
  searchTerm?: string | null;
  fieldsFilled?: number | null;
  category?: string | null;
  radius?: number | null;
  status?: string;
  labelId?: string | null;
};

type LeadFormProps = {
  lead?: Lead;
};

export function LeadForm({ lead }: LeadFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [labelId, setLabelId] = useState<string | null>(lead?.labelId || null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    // Helper to get string value or undefined
    const getString = (key: string) => {
      const value = formData.get(key);
      return value && value !== "" ? (value as string) : undefined;
    };

    const data = {
      googleId: getString("googleId"),
      businessName: formData.get("businessName") as string,
      registeredName: getString("registeredName"),
      foundationDate: formData.get("foundationDate")
        ? new Date(formData.get("foundationDate") as string)
        : undefined,
      companyRegistrationID: getString("companyRegistrationID"),
      address: getString("address"),
      city: getString("city"),
      state: getString("state"),
      country: getString("country"),
      zipCode: getString("zipCode"),
      vicinity: getString("vicinity"),
      phone: getString("phone"),
      whatsapp: getString("whatsapp"),
      website: getString("website"),
      email: getString("email"),
      instagram: getString("instagram"),
      linkedin: getString("linkedin"),
      facebook: getString("facebook"),
      twitter: getString("twitter"),
      tiktok: getString("tiktok"),
      categories: getString("categories"),
      rating: formData.get("rating")
        ? parseFloat(formData.get("rating") as string)
        : undefined,
      priceLevel: formData.get("priceLevel")
        ? parseInt(formData.get("priceLevel") as string)
        : undefined,
      userRatingsTotal: formData.get("userRatingsTotal")
        ? parseInt(formData.get("userRatingsTotal") as string)
        : undefined,
      permanentlyClosed: formData.get("permanentlyClosed") === "on",
      types: getString("types"),
      secondaryActivities: getString("secondaryActivities"),
      category: getString("category"),
      radius: formData.get("radius")
        ? parseInt(formData.get("radius") as string)
        : undefined,
      companyOwner: getString("companyOwner"),
      companySize: getString("companySize"),
      revenue: formData.get("revenue")
        ? parseFloat(formData.get("revenue") as string)
        : undefined,
      employeesCount: formData.get("employeesCount")
        ? parseInt(formData.get("employeesCount") as string)
        : undefined,
      description: getString("description"),
      equityCapital: formData.get("equityCapital")
        ? parseFloat(formData.get("equityCapital") as string)
        : undefined,
      businessStatus: getString("businessStatus"),
      primaryActivity: getString("primaryActivity"),
      secondaryActivities: getString("secondaryActivities"),
      source: getString("source"),
      quality: getString("quality") as "cold" | "warm" | "hot" | undefined,
      searchTerm: getString("searchTerm"),
      fieldsFilled: formData.get("fieldsFilled")
        ? parseInt(formData.get("fieldsFilled") as string)
        : undefined,
      category: getString("category"),
      radius: formData.get("radius")
        ? parseInt(formData.get("radius") as string)
        : undefined,
      status: (getString("status") || "new") as "new" | "contacted" | "qualified" | "disqualified",
      labelId: labelId || undefined,
    };

    try {
      if (lead?.id) {
        await updateLead(lead.id, data);
        toast.success("Lead atualizado com sucesso!");
        router.push(`/leads/${lead.id}`);
      } else {
        const newLead = await createLead(data);
        toast.success("Lead criado com sucesso!");
        router.push(`/leads/${newLead.id}`);
      }
      router.refresh();
    } catch (error) {
      console.error("Error saving lead:", error);
      if (error instanceof Error) {
        // Check if it's a Zod validation error
        try {
          const zodError = JSON.parse(error.message);
          if (Array.isArray(zodError)) {
            const firstError = zodError[0];
            toast.error(`Erro de validação: ${firstError.message}`, {
              description: `Campo: ${firstError.path.join(".")}`,
            });
            return;
          }
        } catch {
          // Not a JSON error, show the original message
        }
        toast.error(error.message);
      } else {
        toast.error("Erro ao salvar lead");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Label */}
      <div className="rounded-lg bg-[#1a0022] p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-200">
          Label
        </h2>
        <LabelSelect
          value={labelId}
          onChange={setLabelId}
          placeholder="Selecione ou crie uma label..."
        />
      </div>

      {/* Informações Básicas */}
      <div className="rounded-lg bg-[#1a0022] p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-200">
          Informações Básicas
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Nome Comercial *
            </label>
            <input
              type="text"
              name="businessName"
              required
              defaultValue={lead?.businessName}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Razão Social
            </label>
            <input
              type="text"
              name="registeredName"
              defaultValue={lead?.registeredName || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              CNPJ
            </label>
            <input
              type="text"
              name="companyRegistrationID"
              defaultValue={lead?.companyRegistrationID || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Data de Fundação
            </label>
            <input
              type="date"
              name="foundationDate"
              defaultValue={
                lead?.foundationDate
                  ? new Date(lead.foundationDate).toISOString().split("T")[0]
                  : ""
              }
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Status
            </label>
            <select
              name="status"
              defaultValue={lead?.status || "new"}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            >
              <option value="new">Novo</option>
              <option value="contacted">Contatado</option>
              <option value="qualified">Qualificado</option>
              <option value="disqualified">Desqualificado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Qualidade
            </label>
            <select
              name="quality"
              defaultValue={lead?.quality || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            >
              <option value="">Selecione...</option>
              <option value="cold">Frio</option>
              <option value="warm">Morno</option>
              <option value="hot">Quente</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300">
            Descrição
          </label>
          <textarea
            name="description"
            rows={3}
            defaultValue={lead?.description || ""}
            className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
          />
        </div>
      </div>

      {/* Localização */}
      <div className="rounded-lg bg-[#1a0022] p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-200">
          Localização
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300">
              Endereço
            </label>
            <input
              type="text"
              name="address"
              defaultValue={lead?.address || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Bairro/Região
            </label>
            <input
              type="text"
              name="vicinity"
              defaultValue={lead?.vicinity || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Cidade
            </label>
            <input
              type="text"
              name="city"
              defaultValue={lead?.city || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Estado
            </label>
            <input
              type="text"
              name="state"
              defaultValue={lead?.state || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              País
            </label>
            <select
              name="country"
              defaultValue={lead?.country || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
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
            <label className="block text-sm font-medium text-gray-300">
              CEP
            </label>
            <input
              type="text"
              name="zipCode"
              defaultValue={lead?.zipCode || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
        </div>
      </div>

      {/* Contato */}
      <div className="rounded-lg bg-[#1a0022] p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-200">
          Contato da Empresa
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Telefone
            </label>
            <input
              type="tel"
              name="phone"
              defaultValue={lead?.phone || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              WhatsApp
            </label>
            <input
              type="tel"
              name="whatsapp"
              defaultValue={lead?.whatsapp || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              type="email"
              name="email"
              defaultValue={lead?.email || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Website
            </label>
            <input
              type="text"
              name="website"
              placeholder="www.exemplo.com.br ou https://exemplo.com.br"
              defaultValue={lead?.website || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
        </div>
      </div>

      {/* Redes Sociais */}
      <div className="rounded-lg bg-[#1a0022] p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-200">
          Redes Sociais
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Instagram
            </label>
            <input
              type="text"
              name="instagram"
              defaultValue={lead?.instagram || ""}
              placeholder="@usuario"
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              LinkedIn
            </label>
            <input
              type="text"
              name="linkedin"
              defaultValue={lead?.linkedin || ""}
              placeholder="linkedin.com/company/..."
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Facebook
            </label>
            <input
              type="text"
              name="facebook"
              defaultValue={lead?.facebook || ""}
              placeholder="facebook.com/..."
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Twitter/X
            </label>
            <input
              type="text"
              name="twitter"
              defaultValue={lead?.twitter || ""}
              placeholder="@usuario"
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              TikTok
            </label>
            <input
              type="text"
              name="tiktok"
              defaultValue={lead?.tiktok || ""}
              placeholder="@usuario"
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
        </div>
      </div>

      {/* Informações da Empresa */}
      <div className="rounded-lg bg-[#1a0022] p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-200">
          Informações da Empresa
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Proprietário/CEO
            </label>
            <input
              type="text"
              name="companyOwner"
              defaultValue={lead?.companyOwner || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Tamanho da Empresa
            </label>
            <select
              name="companySize"
              defaultValue={lead?.companySize || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            >
              <option value="">Selecione...</option>
              {companySizes.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Receita Anual (R$)
            </label>
            <input
              type="number"
              step="0.01"
              name="revenue"
              defaultValue={lead?.revenue || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Capital Social (R$)
            </label>
            <input
              type="number"
              step="0.01"
              name="equityCapital"
              defaultValue={lead?.equityCapital || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Número de Funcionários
            </label>
            <input
              type="number"
              name="employeesCount"
              defaultValue={lead?.employeesCount || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Status do Negócio
            </label>
            <input
              type="text"
              name="businessStatus"
              placeholder="Ativa, Suspensa, etc"
              defaultValue={lead?.businessStatus || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Atividade Primária
            </label>
            <input
              type="text"
              name="primaryActivity"
              placeholder="CNAE ou descrição"
              defaultValue={lead?.primaryActivity || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Atividades Secundárias
            </label>
            <input
              type="text"
              name="secondaryActivities"
              placeholder="Outras atividades (separadas por vírgula)"
              defaultValue={lead?.secondaryActivities || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
        </div>
      </div>

      {/* Google Places */}
      <div className="rounded-lg bg-[#1a0022] p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-200">
          Informações do Google Places
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Google ID
            </label>
            <input
              type="text"
              name="googleId"
              defaultValue={lead?.googleId || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Categorias
            </label>
            <input
              type="text"
              name="categories"
              placeholder="Restaurante, Café, etc"
              defaultValue={lead?.categories || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Tipos
            </label>
            <input
              type="text"
              name="types"
              placeholder="restaurant, cafe, store"
              defaultValue={lead?.types || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Avaliação (0-5)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              name="rating"
              defaultValue={lead?.rating || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Total de Avaliações
            </label>
            <input
              type="number"
              name="userRatingsTotal"
              defaultValue={lead?.userRatingsTotal || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Nível de Preço (1-4)
            </label>
            <input
              type="number"
              min="1"
              max="4"
              name="priceLevel"
              defaultValue={lead?.priceLevel || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <input
                type="checkbox"
                name="permanentlyClosed"
                defaultChecked={lead?.permanentlyClosed}
                className="rounded border-[#792990] bg-[#2d1b3d] text-[#792990] focus:ring-[#792990]"
              />
              Permanentemente Fechado
            </label>
          </div>
        </div>
      </div>

      {/* Metadados */}
      <div className="rounded-lg bg-[#1a0022] p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-200">
          Metadados de Busca
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Fonte
            </label>
            <input
              type="text"
              name="source"
              placeholder="Google, LinkedIn, Indicação..."
              defaultValue={lead?.source || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Termo de Busca
            </label>
            <input
              type="text"
              name="searchTerm"
              placeholder="Palavras-chave usadas"
              defaultValue={lead?.searchTerm || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Categoria
            </label>
            <input
              type="text"
              name="category"
              placeholder="B2B, B2C, Varejo..."
              defaultValue={lead?.category || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Raio de Busca (km)
            </label>
            <input
              type="number"
              name="radius"
              placeholder="Se foi busca geográfica"
              defaultValue={lead?.radius || ""}
              className="mt-1 block w-full rounded-md border border-[#792990] bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:border-[#792990] focus:outline-none focus:ring-1 focus:ring-[#792990]"
            />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-600 px-6 py-2 text-gray-300 hover:bg-[#2d1b3d]"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-[#792990] px-6 py-2 text-white hover:bg-[#9333b8] disabled:opacity-50"
        >
          {isSubmitting
            ? "Salvando..."
            : lead?.id
              ? "Atualizar Lead"
              : "Criar Lead"}
        </button>
      </div>
    </form>
  );
}
