"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  createTechProfileLanguage,
  createTechProfileFramework,
  createTechProfileHosting,
  createTechProfileDatabase,
  createTechProfileERP,
  createTechProfileCRM,
  createTechProfileEcommerce,
  generateUniqueTechProfileSlug,
} from "@/actions/tech-profile-options";

type TechProfileType = "languages" | "frameworks" | "hosting" | "databases" | "erps" | "crms" | "ecommerces";

interface TechProfileGenericFormProps {
  type: TechProfileType;
  usedOrders: number[];
}

export function TechProfileGenericForm({ type, usedOrders }: TechProfileGenericFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const needsTypeField = type === "hosting" || type === "databases";

  // Gera lista de ordens disponíveis (0 a 99, excluindo as já usadas)
  const availableOrders = useMemo(() => {
    const orders: number[] = [];
    for (let i = 0; i <= 99; i++) {
      if (!usedOrders.includes(i)) {
        orders.push(i);
      }
    }
    return orders;
  }, [usedOrders]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = formData.get("name") as string;

    try {
      const slug = await generateUniqueTechProfileSlug(type, name);

      const baseData = {
        name,
        slug,
        color: (formData.get("color") as string) || null,
        icon: (formData.get("icon") as string) || null,
        order: parseInt(formData.get("order") as string) || 0,
        isActive: true,
      };

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao criar item";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholders = () => {
    switch (type) {
      case "languages": return { name: "JavaScript, Python, PHP..." };
      case "frameworks": return { name: "React, Django, Laravel..." };
      case "hosting": return { name: "AWS, Azure, DigitalOcean..." };
      case "databases": return { name: "PostgreSQL, MySQL, MongoDB..." };
      case "erps": return { name: "SAP, Oracle, Totvs..." };
      case "crms": return { name: "Salesforce, HubSpot, Pipedrive..." };
      case "ecommerces": return { name: "Shopify, WooCommerce, VTEX..." };
    }
  };

  const placeholders = getPlaceholders();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

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
        <p className="mt-1 text-xs text-gray-500">
          O identificador (slug) será gerado automaticamente
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
          Ordem de Exibição
        </label>
        <select
          name="order"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
        >
          {availableOrders.map((order) => (
            <option key={order} value={order}>
              {order}
            </option>
          ))}
        </select>
        {usedOrders.length > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            Ordens já usadas: {usedOrders.sort((a, b) => a - b).join(", ")}
          </p>
        )}
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
