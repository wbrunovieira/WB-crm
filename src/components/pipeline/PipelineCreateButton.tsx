"use client";

import { useState } from "react";
import { createPipeline } from "@/actions/pipelines";
import { useRouter } from "next/navigation";

export function PipelineCreateButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const pipeline = await createPipeline({ name: name.trim(), isDefault });
      setIsOpen(false);
      setName("");
      setIsDefault(false);
      router.push(`/pipelines/${pipeline.id}`);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao criar pipeline");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-md bg-primary px-4 py-2 text-white hover:bg-blue-700"
      >
        + Novo Pipeline
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold">Criar Novo Pipeline</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Pipeline *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Vendas B2B, Vendas B2C..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="isDefault" className="text-sm text-gray-700">
                  Definir como pipeline padrão
                </label>
              </div>

              <div className="text-sm text-gray-500">
                O pipeline será criado com 4 estágios padrão que você poderá editar depois.
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setName("");
                  setIsDefault(false);
                }}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={isSaving || !name.trim()}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? "Criando..." : "Criar Pipeline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
