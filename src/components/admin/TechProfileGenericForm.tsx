"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createTechProfileLanguage,
  createTechProfileFramework,
  createTechProfileHosting,
  createTechProfileDatabase,
  createTechProfileERP,
  createTechProfileCRM,
  createTechProfileEcommerce,
} from "@/actions/tech-profile-options";

type TechProfileType = "languages" | "frameworks" | "hosting" | "databases" | "erps" | "crms" | "ecommerces";

interface TechProfileGenericFormProps {
  type: TechProfileType;
}

export function TechProfileGenericForm({ type }: TechProfileGenericFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const needsTypeField = type === "hosting" || type === "databases";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const baseData = {
      name: formData.get("name") as string,
      slug: formData.get("slug") as string,
      color: formData.get("color") as string || null,
      icon: formData.get("icon") as string || null,
      order: parseInt(formData.get("order") as string) || 0,
      isActive: true,
    };

    try {
      switch (type) {
        case "languages":
          await createTechProfileLanguage(baseData);
          break;
        case "frameworks":
          await createTechProfileFramework(baseData);
          break;
        case "hosting":
          await createTechProfileHosting({
            ...baseData,
            type: (formData.get("type") as "cloud" | "vps" | "shared" | "dedicated" | "serverless") || "cloud",
          });
          break;
        case "databases":
          await createTechProfileDatabase({
            ...baseData,
            type: (formData.get("type") as "relational" | "nosql" | "cache" | "search") || "relational",
          });
          break;
        case "erps":
          await createTechProfileERP(baseData);
          break;
        case "crms":
          await createTechProfileCRM(baseData);
          break;
        case "ecommerces":
          await createTechProfileEcommerce(baseData);
          break;
      }

      form.reset();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao criar item";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholders = () => {
    switch (type) {
      case "languages": return { name: "JavaScript, Python, PHP...", slug: "javascript, python..." };
      case "frameworks": return { name: "React, Django, Laravel...", slug: "react, django..." };
      case "hosting": return { name: "AWS, Azure, DigitalOcean...", slug: "aws, azure..." };
      case "databases": return { name: "PostgreSQL, MySQL, MongoDB...", slug: "postgresql, mysql..." };
      case "erps": return { name: "SAP, Oracle, Totvs...", slug: "sap, oracle..." };
      case "crms": return { name: "Salesforce, HubSpot, Pipedrive...", slug: "salesforce, hubspot..." };
      case "ecommerces": return { name: "Shopify, WooCommerce, VTEX...", slug: "shopify, woocommerce..." };
    }
  };

  const placeholders = getPlaceholders();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Nome *
        </label>
        <input
          type="text"
          name="name"
          required
          maxLength={100}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder={placeholders.name}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Slug *
        </label>
        <input
          type="text"
          name="slug"
          required
          maxLength={50}
          pattern="^[a-z0-9-]+$"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder={placeholders.slug}
        />
        <p className="mt-1 text-xs text-gray-500">
          Apenas letras minúsculas, números e hífens
        </p>
      </div>

      {needsTypeField && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Tipo *
          </label>
          <select
            name="type"
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          >
            {type === "hosting" ? (
              <>
                <option value="">Selecione...</option>
                <option value="cloud">Cloud</option>
                <option value="vps">VPS</option>
                <option value="shared">Compartilhado</option>
                <option value="dedicated">Dedicado</option>
                <option value="serverless">Serverless</option>
              </>
            ) : (
              <>
                <option value="">Selecione...</option>
                <option value="relational">Relacional</option>
                <option value="nosql">NoSQL</option>
                <option value="cache">Cache</option>
                <option value="search">Search</option>
              </>
            )}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Cor (Hex)
        </label>
        <input
          type="color"
          name="color"
          className="mt-1 h-10 w-full rounded-md border border-gray-300"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Ícone/Logo URL
        </label>
        <input
          type="text"
          name="icon"
          maxLength={200}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="URL da imagem ou emoji"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Ordem
        </label>
        <input
          type="number"
          name="order"
          min={0}
          defaultValue={0}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-primary px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? "Criando..." : "Criar"}
      </button>
    </form>
  );
}
