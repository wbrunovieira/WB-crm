"use client";

import { useState, useEffect, useRef } from "react";
import { getLabels, createLabel, type Label } from "@/actions/labels";

interface MultiLabelSelectProps {
  value: string[];
  onChange: (labelIds: string[]) => void;
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

export function MultiLabelSelect({
  value = [],
  onChange,
  placeholder = "Selecione labels...",
}: MultiLabelSelectProps) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
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
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadLabels() {
    const data = await getLabels();
    setLabels(data);
  }

  const selectedLabels = labels.filter((l) => value.includes(l.id));

  const filteredLabels = labels.filter((label) =>
    label.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function toggleLabel(labelId: string) {
    if (value.includes(labelId)) {
      onChange(value.filter((id) => id !== labelId));
    } else {
      onChange([...value, labelId]);
    }
  }

  function removeLabel(labelId: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(value.filter((id) => id !== labelId));
  }

  async function handleCreateLabel() {
    if (!newLabelName.trim()) return;

    const newLabel = await createLabel(newLabelName.trim(), newLabelColor);
    setLabels([...labels, newLabel]);
    onChange([...value, newLabel.id]);
    setNewLabelName("");
    setNewLabelColor(DEFAULT_COLORS[0]);
    setIsCreating(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* Selected labels display */}
      <div
        onClick={() => setIsOpen(true)}
        className="min-h-[42px] w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary cursor-pointer"
      >
        {selectedLabels.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {selectedLabels.map((label) => (
              <span
                key={label.id}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
                <button
                  type="button"
                  onClick={(e) => removeLabel(label.id, e)}
                  className="hover:bg-white/20 rounded-full p-0.5"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar labels..."
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-y-auto">
            {filteredLabels.length > 0 ? (
              filteredLabels.map((label) => {
                const isSelected = value.includes(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => toggleLabel(label.id)}
                    className={`flex w-full items-center gap-3 px-4 py-2 hover:bg-gray-100 ${
                      isSelected ? "bg-gray-50" : ""
                    }`}
                  >
                    <div
                      className="h-4 w-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="flex-1 text-left">{label.name}</span>
                    {isSelected && (
                      <svg
                        className="h-4 w-4 text-primary"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                );
              })
            ) : searchTerm ? (
              <div className="px-4 py-2 text-sm text-gray-500">
                Nenhuma label encontrada
              </div>
            ) : null}
          </div>

          {!isCreating ? (
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
                  Nome da Label
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
                    setNewLabelName("");
                  }}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateLabel}
                  disabled={!newLabelName.trim()}
                  className="flex-1 rounded-md bg-primary px-3 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  Criar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
