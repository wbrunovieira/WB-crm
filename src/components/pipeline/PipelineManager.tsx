"use client";

import { useState } from "react";
import { updatePipeline, deletePipeline, setDefaultPipeline } from "@/actions/pipelines";
import { useRouter } from "next/navigation";

interface PipelineManagerProps {
  pipeline: {
    id: string;
    name: string;
    isDefault: boolean;
  };
}

export function PipelineManager({ pipeline }: PipelineManagerProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(pipeline.name);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await updatePipeline(pipeline.id, { name: name.trim(), isDefault: pipeline.isDefault });
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao atualizar pipeline");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSetDefault() {
    try {
      await setDefaultPipeline(pipeline.id);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao definir como padrão");
    }
  }

  async function handleDelete() {
    if (!confirm(`Tem certeza que deseja excluir o pipeline "${pipeline.name}"?`)) return;

    try {
      await deletePipeline(pipeline.id);
      router.push("/pipelines");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao excluir pipeline");
    }
  }

  return (
    <div className="flex items-center gap-4">
      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-lg font-bold focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
          >
            Salvar
          </button>
          <button
            onClick={() => {
              setName(pipeline.name);
              setIsEditing(false);
            }}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-bold">{pipeline.name}</h1>
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-gray-500 hover:text-primary"
            title="Editar nome"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
        </>
      )}

      <div className="ml-auto flex items-center gap-2">
        {!pipeline.isDefault && (
          <button
            onClick={handleSetDefault}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Definir como padrão
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={pipeline.isDefault}
          className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title={pipeline.isDefault ? "Não é possível excluir o pipeline padrão" : "Excluir pipeline"}
        >
          Excluir
        </button>
      </div>
    </div>
  );
}
