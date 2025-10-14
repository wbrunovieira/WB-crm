"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTechLanguage } from "@/actions/tech-languages";

export function TechLanguageForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      await createTechLanguage({
        name: formData.get("name") as string,
        slug: formData.get("slug") as string,
        color: formData.get("color") as string || null,
        icon: formData.get("icon") as string || null,
        isActive: true,
      });

      form.reset();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao criar linguagem";
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
          placeholder="JavaScript, Python, PHP..."
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
          placeholder="javascript, python..."
        />
        <p className="mt-1 text-xs text-gray-500">
          Apenas letras minúsculas, números e hífens
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
        {loading ? "Criando..." : "Criar Linguagem"}
      </button>
    </form>
  );
}
