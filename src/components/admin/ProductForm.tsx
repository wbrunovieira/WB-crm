"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/actions/products";

interface BusinessLine {
  id: string;
  name: string;
  isActive: boolean;
}

interface ProductFormProps {
  businessLines: BusinessLine[];
}

export function ProductForm({ businessLines }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeBusinessLines = businessLines.filter((bl) => bl.isActive);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      await createProduct({
        name: formData.get("name") as string,
        slug: formData.get("slug") as string,
        description: formData.get("description") as string || null,
        businessLineId: formData.get("businessLineId") as string,
        basePrice: formData.get("basePrice")
          ? parseFloat(formData.get("basePrice") as string)
          : null,
        currency: "BRL",
        pricingType: (formData.get("pricingType") as string) || null,
        isActive: true,
        order: parseInt(formData.get("order") as string) || 0,
      });

      form.reset();
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erro ao criar produto");
    } finally {
      setLoading(false);
    }
  };

  if (activeBusinessLines.length === 0) {
    return (
      <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
        <p className="font-medium">Atenção!</p>
        <p className="mt-1">
          Você precisa criar pelo menos uma Linha de Negócio ativa antes de
          cadastrar produtos.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Linha de Negócio <span className="text-red-500">*</span>
        </label>
        <select
          name="businessLineId"
          required
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">Selecione...</option>
          {activeBusinessLines.map((bl) => (
            <option key={bl.id} value={bl.id}>
              {bl.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Nome <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          required
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="Ex: E-commerce Completo"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Slug <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="slug"
          required
          pattern="[a-z0-9-]+"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="Ex: ecommerce-completo"
        />
        <p className="mt-1 text-xs text-gray-500">
          Apenas letras minúsculas, números e hífens
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Descrição
        </label>
        <textarea
          name="description"
          rows={3}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="Breve descrição do produto..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Preço Base (R$)
        </label>
        <input
          type="number"
          name="basePrice"
          min="0"
          step="0.01"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="Valor de referência"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Tipo de Precificação
        </label>
        <select
          name="pricingType"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">Selecione...</option>
          <option value="fixed">Fixo</option>
          <option value="hourly">Por Hora</option>
          <option value="monthly">Mensal</option>
          <option value="custom">Customizado</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Ordem de Exibição
        </label>
        <input
          type="number"
          name="order"
          min="0"
          defaultValue="0"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-primary px-4 py-2 text-white hover:bg-purple-700 disabled:bg-gray-300"
      >
        {loading ? "Criando..." : "Criar Produto"}
      </button>
    </form>
  );
}
