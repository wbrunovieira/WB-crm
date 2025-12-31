"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBusinessLine } from "@/actions/business-lines";

export function BusinessLineForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      await createBusinessLine({
        name: formData.get("name") as string,
        slug: formData.get("slug") as string,
        description: formData.get("description") as string || null,
        color: formData.get("color") as string || null,
        icon: formData.get("icon") as string || null,
        isActive: true,
        order: parseInt(formData.get("order") as string) || 0,
      });

      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar linha de negócio");
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
          Nome <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          required
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="Ex: Desenvolvimento Web"
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
          placeholder="Ex: dev-web"
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
          placeholder="Breve descrição da linha de negócio..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Cor (Hex)
        </label>
        <input
          type="color"
          name="color"
          defaultValue="#792990"
          className="mt-1 h-10 w-full rounded-md border border-gray-300"
        />
        <p className="mt-1 text-xs text-gray-500">
          Cor para identificação visual da linha de negócio
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Ícone (Lucide)
        </label>
        <input
          type="text"
          name="icon"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="Ex: Code, Zap, Brain"
        />
        <p className="mt-1 text-xs text-gray-500">
          Nome do ícone do Lucide React
        </p>
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
        {loading ? "Criando..." : "Criar Linha de Negócio"}
      </button>
    </form>
  );
}
