"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTechCategory } from "@/actions/tech-categories";

export function TechCategoryForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      await createTechCategory({
        name: formData.get("name") as string,
        slug: formData.get("slug") as string,
        description: formData.get("description") as string || null,
        color: formData.get("color") as string || null,
        icon: formData.get("icon") as string || null,
        order: parseInt(formData.get("order") as string) || 0,
        isActive: true,
      });

      form.reset();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao criar categoria";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

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
          placeholder="Frontend, Backend, Fullstack..."
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
          placeholder="frontend, backend..."
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
        {loading ? "Criando..." : "Criar Categoria"}
      </button>
    </form>
  );
}
