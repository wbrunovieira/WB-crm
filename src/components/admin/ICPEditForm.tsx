"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateICP } from "@/actions/icps";

interface ICP {
  id: string;
  name: string;
  slug: string;
  content: string;
  status: string;
}

interface ICPEditFormProps {
  icp: ICP;
}

export function ICPEditForm({ icp }: ICPEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      await updateICP(icp.id, {
        name: formData.get("name") as string,
        slug: formData.get("slug") as string,
        content: formData.get("content") as string,
        status: formData.get("status") as "draft" | "active" | "archived",
        changeReason: formData.get("changeReason") as string || undefined,
      });
      router.push(`/admin/icps/${icp.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar ICP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
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
            name="name"
            required
            defaultValue={icp.name}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="slug" className="mb-1 block text-sm font-medium text-gray-700">
            Slug *
          </label>
          <input
            type="text"
            id="slug"
            name="slug"
            required
            defaultValue={icp.slug}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="mt-1 text-xs text-gray-500">
            Apenas letras minúsculas, números e hífens
          </p>
        </div>

        <div>
          <label htmlFor="content" className="mb-1 block text-sm font-medium text-gray-700">
            Descrição do ICP *
          </label>
          <textarea
            id="content"
            name="content"
            required
            rows={12}
            defaultValue={icp.content}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={icp.status}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="draft">Rascunho</option>
            <option value="active">Ativo</option>
            <option value="archived">Arquivado</option>
          </select>
        </div>

        <div>
          <label htmlFor="changeReason" className="mb-1 block text-sm font-medium text-gray-700">
            Motivo da alteração
          </label>
          <input
            type="text"
            id="changeReason"
            name="changeReason"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Ex: Atualização de critérios de qualificação"
          />
          <p className="mt-1 text-xs text-gray-500">
            Opcional. Será registrado no histórico de versões.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Salvar Alterações"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
