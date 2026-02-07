"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createTechCategory, generateUniqueTechCategorySlug } from "@/actions/tech-categories";

interface TechCategoryFormProps {
  usedOrders: number[];
}

export function TechCategoryForm({ usedOrders }: TechCategoryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

    try {
      const name = formData.get("name") as string;
      const slug = await generateUniqueTechCategorySlug(name);

      await createTechCategory({
        name,
        slug,
        description: (formData.get("description") as string) || null,
        color: (formData.get("color") as string) || null,
        icon: (formData.get("icon") as string) || null,
        order: parseInt(formData.get("order") as string) || 0,
        isActive: true,
      });

      form.reset();
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao criar categoria";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

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
          placeholder="Frontend, Backend, Fullstack..."
        />
        <p className="mt-1 text-xs text-gray-500">
          O identificador (slug) será gerado automaticamente
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Descrição
        </label>
        <textarea
          name="description"
          maxLength={500}
          rows={3}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="Descrição da categoria..."
        />
      </div>

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
          Ícone
        </label>
        <input
          type="text"
          name="icon"
          maxLength={50}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="emoji ou nome do ícone"
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
        {loading ? "Criando..." : "Criar Categoria"}
      </button>
    </form>
  );
}
