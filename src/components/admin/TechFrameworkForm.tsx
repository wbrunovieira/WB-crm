"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTechFramework, generateUniqueTechFrameworkSlug } from "@/actions/tech-frameworks";

export function TechFrameworkForm() {
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
      const name = formData.get("name") as string;
      const slug = await generateUniqueTechFrameworkSlug(name);

      await createTechFramework({
        name,
        slug,
        languageSlug: (formData.get("languageSlug") as string) || null,
        color: (formData.get("color") as string) || null,
        icon: (formData.get("icon") as string) || null,
        isActive: true,
      });

      form.reset();
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao criar framework";
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
          placeholder="React, Vue, Django..."
        />
        <p className="mt-1 text-xs text-gray-500">
          O identificador (slug) será gerado automaticamente
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Slug da Linguagem (opcional)
        </label>
        <input
          type="text"
          name="languageSlug"
          maxLength={50}
          pattern="^[a-z0-9-]*$"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="javascript, python..."
        />
        <p className="mt-1 text-xs text-gray-500">
          Para vincular o framework a uma linguagem
        </p>
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

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-primary px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? "Criando..." : "Criar Framework"}
      </button>
    </form>
  );
}
