"use client";

import { useState, useEffect, useRef } from "react";
import { getLabels, createLabel, updateLabel, deleteLabel, type Label } from "@/actions/labels";

interface LabelSelectProps {
  value?: string | null;
  onChange: (labelId: string | null) => void;
  placeholder?: string;
}

const DEFAULT_COLORS = [
  "#EF4444", // red
  "#F59E0B", // amber
  "#10B981", // green
  "#3B82F6", // blue
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#6366F1", // indigo
  "#14B8A6", // teal
];

export function LabelSelect({ value, onChange, placeholder = "Selecione uma label..." }: LabelSelectProps) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(DEFAULT_COLORS[0]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLabels();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setEditingLabel(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadLabels() {
    const data = await getLabels();
    setLabels(data);
  }

  const selectedLabel = labels.find((l) => l.id === value);

  const filteredLabels = labels.filter((label) =>
    label.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function handleCreateLabel() {
    if (!newLabelName.trim()) return;

    const newLabel = await createLabel(newLabelName.trim(), newLabelColor);
    setLabels([...labels, newLabel]);
    onChange(newLabel.id);
    setNewLabelName("");
    setNewLabelColor(DEFAULT_COLORS[0]);
    setIsCreating(false);
    setIsOpen(false);
  }

  async function handleUpdateLabel() {
    if (!editingLabel || !newLabelName.trim()) return;

    const updatedLabel = await updateLabel(editingLabel.id, newLabelName.trim(), newLabelColor);
    setLabels(labels.map((l) => (l.id === updatedLabel.id ? updatedLabel : l)));
    setNewLabelName("");
    setNewLabelColor(DEFAULT_COLORS[0]);
    setEditingLabel(null);
  }

  async function handleDeleteLabel(labelId: string) {
    if (!confirm("Tem certeza que deseja excluir esta label?")) return;

    await deleteLabel(labelId);
    setLabels(labels.filter((l) => l.id !== labelId));
    if (value === labelId) {
      onChange(null);
    }
  }

  function startEditing(label: Label, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingLabel(label);
    setNewLabelName(label.name);
    setNewLabelColor(label.color);
    setIsCreating(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={selectedLabel ? selectedLabel.name : placeholder}
        className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {selectedLabel && (
        <div className="absolute right-2 top-2 flex items-center gap-2">
          <div
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: selectedLabel.color }}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
              setSearchTerm("");
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      )}

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg">
          <div className="max-h-60 overflow-y-auto">
            {filteredLabels.length > 0 ? (
              filteredLabels.map((label) => (
                <div
                  key={label.id}
                  className="flex w-full items-center gap-3 px-4 py-2 hover:bg-gray-100 group"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange(label.id);
                      setSearchTerm("");
                      setIsOpen(false);
                    }}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <div
                      className="h-4 w-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="flex-1">{label.name}</span>
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => startEditing(label, e)}
                      className="p-1 text-gray-500 hover:text-blue-600"
                      title="Editar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLabel(label.id);
                      }}
                      className="p-1 text-gray-500 hover:text-red-600"
                      title="Excluir"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            ) : searchTerm ? (
              <div className="px-4 py-2 text-sm text-gray-500">
                Nenhuma label encontrada
              </div>
            ) : null}
          </div>

          {!isCreating && !editingLabel ? (
            <button
              type="button"
              onClick={() => {
                setIsCreating(true);
                setNewLabelName(searchTerm);
              }}
              className="w-full border-t border-gray-200 px-4 py-2 text-left text-sm text-primary hover:bg-gray-50"
            >
              + Criar nova label
              {searchTerm && ` "${searchTerm}"`}
            </button>
          ) : (
            <div className="border-t border-gray-200 p-4">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingLabel ? "Editar Label" : "Nome da Label"}
                </label>
                <input
                  type="text"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Digite o nome..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor
                </label>
                <div className="flex gap-2 flex-wrap">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewLabelColor(color)}
                      className={`h-8 w-8 rounded-full border-2 ${
                        newLabelColor === color
                          ? "border-gray-900"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingLabel(null);
                    setNewLabelName("");
                  }}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={editingLabel ? handleUpdateLabel : handleCreateLabel}
                  disabled={!newLabelName.trim()}
                  className="flex-1 rounded-md bg-primary px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {editingLabel ? "Atualizar" : "Criar"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
