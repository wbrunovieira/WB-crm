"use client";

import { useState } from "react";
import { Pencil, Trash2, X, Check, Tag } from "lucide-react";
import { deleteGmailTemplate, updateGmailTemplate } from "@/actions/gmail-templates";
import { GmailTemplateForm } from "@/components/admin/GmailTemplateForm";

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string | null;
  active: boolean;
}

export function GmailTemplatesList({ templates }: { templates: Template[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleToggleActive(t: Template) {
    await updateGmailTemplate(t.id, { active: !t.active });
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await deleteGmailTemplate(id);
    setDeletingId(null);
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="text-sm text-gray-500">Nenhum template criado ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {templates.map((t) => (
        <div
          key={t.id}
          className={`rounded-lg border bg-white shadow-sm transition-all ${
            t.active ? "border-gray-200" : "border-gray-100 opacity-60"
          }`}
        >
          {editingId === t.id ? (
            <div className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Editando: {t.name}</span>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <GmailTemplateForm
                template={t}
                onSuccess={() => setEditingId(null)}
              />
            </div>
          ) : (
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{t.name}</span>
                    {t.category && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                        <Tag className="h-3 w-3" />
                        {t.category}
                      </span>
                    )}
                    {!t.active && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        Inativo
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-600 truncate">
                    <span className="font-medium text-gray-500">Assunto:</span> {t.subject}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">
                    {t.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120)}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Toggle ativo/inativo */}
                  <button
                    title={t.active ? "Desativar" : "Ativar"}
                    onClick={() => handleToggleActive(t)}
                    className={`rounded p-1.5 transition-colors ${
                      t.active
                        ? "text-green-600 hover:bg-green-50"
                        : "text-gray-400 hover:bg-gray-100"
                    }`}
                  >
                    <Check className="h-4 w-4" />
                  </button>

                  <button
                    title="Editar"
                    onClick={() => setEditingId(t.id)}
                    className="rounded p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <button
                    title="Excluir"
                    disabled={deletingId === t.id}
                    onClick={() => handleDelete(t.id)}
                    className="rounded p-1.5 text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
