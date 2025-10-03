"use client";

import { useState } from "react";
import { createStage, updateStage, deleteStage, reorderStages } from "@/actions/stages";
import { useRouter } from "next/navigation";

interface Stage {
  id: string;
  name: string;
  order: number;
  probability: number;
  _count: {
    deals: number;
  };
}

interface StageManagerProps {
  pipelineId: string;
  stages: Stage[];
}

export function StageManager({ pipelineId, stages: initialStages }: StageManagerProps) {
  const router = useRouter();
  const [stages, setStages] = useState(initialStages);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    probability: 50,
  });

  async function handleCreate() {
    if (!formData.name.trim()) return;

    try {
      const newStage = await createStage({
        name: formData.name.trim(),
        probability: formData.probability,
        order: stages.length + 1,
        pipelineId,
      });

      setStages([...stages, { ...newStage, _count: { deals: 0 } }]);
      setFormData({ name: "", probability: 50 });
      setIsCreating(false);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao criar estágio");
    }
  }

  async function handleUpdate(stageId: string) {
    if (!formData.name.trim()) return;

    try {
      await updateStage(stageId, {
        name: formData.name.trim(),
        probability: formData.probability,
        order: stages.find((s) => s.id === stageId)?.order || 0,
        pipelineId,
      });

      setStages(
        stages.map((s) =>
          s.id === stageId
            ? { ...s, name: formData.name.trim(), probability: formData.probability }
            : s
        )
      );
      setEditingId(null);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao atualizar estágio");
    }
  }

  async function handleDelete(stageId: string) {
    const stage = stages.find((s) => s.id === stageId);
    if (!confirm(`Tem certeza que deseja excluir o estágio "${stage?.name}"?`)) return;

    try {
      await deleteStage(stageId);
      setStages(stages.filter((s) => s.id !== stageId));
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao excluir estágio");
    }
  }

  function startEditing(stage: Stage) {
    setEditingId(stage.id);
    setFormData({
      name: stage.name,
      probability: stage.probability,
    });
    setIsCreating(false);
  }

  function cancelEditing() {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ name: "", probability: 50 });
  }

  // Drag and Drop handlers
  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === index) return;

    const newStages = [...stages];
    const draggedStage = newStages[draggedIndex];

    newStages.splice(draggedIndex, 1);
    newStages.splice(index, 0, draggedStage);

    setStages(newStages);
    setDraggedIndex(index);
  }

  async function handleDragEnd() {
    if (draggedIndex === null) return;

    try {
      const stageIds = stages.map((s) => s.id);
      await reorderStages(pipelineId, stageIds);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao reordenar estágios");
      setStages(initialStages);
    } finally {
      setDraggedIndex(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Estágios ({stages.length})</h2>
        <button
          onClick={() => {
            setIsCreating(true);
            setEditingId(null);
            setFormData({ name: "", probability: 50 });
          }}
          className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          + Adicionar Estágio
        </button>
      </div>

      <div className="space-y-3">
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`cursor-move rounded-lg border p-4 transition-all ${
              draggedIndex === index
                ? "border-primary bg-blue-50 opacity-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            {editingId === stage.id ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Estágio
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Probabilidade de Fechamento (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(e) =>
                      setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdate(stage.id)}
                    disabled={!formData.name.trim()}
                    className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{stage.name}</h3>
                    <p className="text-sm text-gray-500">
                      Probabilidade: {stage.probability}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{stage._count.deals}</p>
                    <p className="text-xs text-gray-500">
                      {stage._count.deals === 1 ? "negócio" : "negócios"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditing(stage)}
                      className="p-2 text-gray-500 hover:text-blue-600"
                      title="Editar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(stage.id)}
                      className="p-2 text-gray-500 hover:text-red-600"
                      title="Excluir"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {isCreating && (
          <div className="rounded-lg border border-primary bg-blue-50 p-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Estágio
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Prospecção, Qualificação, Proposta..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Probabilidade de Fechamento (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) =>
                    setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={!formData.name.trim()}
                  className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Criar Estágio
                </button>
                <button
                  onClick={cancelEditing}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {stages.length === 0 && !isCreating && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-500">Nenhum estágio configurado. Clique em "Adicionar Estágio" para começar.</p>
        </div>
      )}
    </div>
  );
}
