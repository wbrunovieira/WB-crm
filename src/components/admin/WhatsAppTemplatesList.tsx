"use client";

import { useState } from "react";
import { deleteWhatsAppTemplate, updateWhatsAppTemplate } from "@/actions/whatsapp-templates";
import { WhatsAppTemplateForm } from "./WhatsAppTemplateForm";
import { toast } from "sonner";
import { Pencil, Trash2, ToggleLeft, ToggleRight, X } from "lucide-react";

type Template = {
  id: string;
  name: string;
  text: string;
  category: string | null;
  active: boolean;
  createdAt: Date;
};

interface WhatsAppTemplatesListProps {
  templates: Template[];
}

export function WhatsAppTemplatesList({ templates }: WhatsAppTemplatesListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  // Group by category
  const grouped: Record<string, Template[]> = {};
  for (const t of templates) {
    const key = t.category ?? "Sem categoria";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  }

  async function handleToggle(t: Template) {
    try {
      await updateWhatsAppTemplate(t.id, { active: !t.active });
      toast.success(t.active ? "Template desativado" : "Template ativado");
    } catch {
      toast.error("Erro ao alterar status");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Deletar template "${name}"?`)) return;
    try {
      await deleteWhatsAppTemplate(id);
      toast.success("Template deletado");
    } catch {
      toast.error("Erro ao deletar template");
    }
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-500">Nenhum template cadastrado ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            {cat}
          </h3>
          <div className="space-y-3">
            {items.map((t) =>
              editingId === t.id ? (
                <div key={t.id} className="rounded-lg border border-[#25D366]/30 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Editando: {t.name}</span>
                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <WhatsAppTemplateForm
                    template={t}
                    onSuccess={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div
                  key={t.id}
                  className={`rounded-lg border bg-white p-4 shadow-sm transition-opacity ${!t.active ? "opacity-50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{t.name}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                        {t.text}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => handleToggle(t)}
                        title={t.active ? "Desativar" : "Ativar"}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        {t.active ? (
                          <ToggleRight className="h-5 w-5 text-[#25D366]" />
                        ) : (
                          <ToggleLeft className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => setEditingId(t.id)}
                        title="Editar"
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.name)}
                        title="Deletar"
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
