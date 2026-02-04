"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createICP, generateUniqueICPSlug } from "@/actions/icps";

export function ICPForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"draft" | "active" | "archived">("draft");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Generate unique slug from name
      const slug = await generateUniqueICPSlug(name);

      await createICP({
        name,
        slug,
        content,
        status,
      });

      // Reset form
      setName("");
      setContent("");
      setStatus("draft");

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar ICP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Novo ICP</h2>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
            Nome *
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Ex: Empresas de Tecnologia B2B"
          />
        </div>

        <div>
          <label htmlFor="content" className="mb-1 block text-sm font-medium text-gray-700">
            Descrição do ICP *
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={8}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Descreva o perfil ideal de cliente...&#10;&#10;• Segmento de mercado&#10;• Tamanho da empresa&#10;• Principais desafios&#10;• Orçamento típico&#10;• Processo de decisão"
          />
        </div>

        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as "draft" | "active" | "archived")}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="draft">Rascunho</option>
            <option value="active">Ativo</option>
            <option value="archived">Arquivado</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? "Criando..." : "Criar ICP"}
        </button>
      </form>
    </div>
  );
}
