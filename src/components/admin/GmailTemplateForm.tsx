"use client";

import { useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import {
  createGmailTemplate,
  updateGmailTemplate,
  type GmailTemplateInput,
} from "@/actions/gmail-templates";
import RichTextEditor, { RichTextEditorHandle } from "@/components/gmail/RichTextEditor";
import { GmailVariablePicker } from "@/components/admin/GmailVariablePicker";

interface GmailTemplateFormProps {
  template?: {
    id: string;
    name: string;
    subject: string;
    body: string;
    category: string | null;
    active: boolean;
  };
  onSuccess?: () => void;
}

export function GmailTemplateForm({ template, onSuccess }: GmailTemplateFormProps) {
  const isEditing = !!template;

  const [name, setName] = useState(template?.name ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [category, setCategory] = useState(template?.category ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const editorRef = useRef<RichTextEditorHandle>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  // Insere variável no campo de assunto (mantém posição do cursor)
  function insertIntoSubject(variable: string) {
    const input = subjectRef.current;
    if (!input) {
      setSubject((prev) => prev + variable);
      return;
    }
    const start = input.selectionStart ?? subject.length;
    const end = input.selectionEnd ?? subject.length;
    const next = subject.slice(0, start) + variable + subject.slice(end);
    setSubject(next);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  }

  // Insere variável no editor de corpo (na posição do cursor)
  function insertIntoBody(variable: string) {
    editorRef.current?.insertAtCursor(variable);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = editorRef.current?.getHTML() ?? "";

    if (!name.trim() || !subject.trim() || (editorRef.current?.isEmpty() ?? true)) {
      setError("Preencha nome, assunto e corpo do template.");
      return;
    }

    setSaving(true);
    setError(null);

    const data: GmailTemplateInput = {
      name: name.trim(),
      subject: subject.trim(),
      body,
      category: category.trim() || undefined,
    };

    const result = isEditing
      ? await updateGmailTemplate(template.id, data)
      : await createGmailTemplate(data);

    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "Erro ao salvar template.");
      return;
    }

    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);

    if (!isEditing) {
      setName("");
      setSubject("");
      setCategory("");
      editorRef.current?.setHTML("");
    }

    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nome */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome do template <span className="text-red-500">*</span>
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex: Boas-vindas, Follow-up comercial"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        />
      </div>

      {/* Categoria */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Categoria <span className="text-gray-400 text-xs">(opcional)</span>
        </label>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="ex: vendas, suporte, cobrança"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        />
      </div>

      {/* Assunto */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Assunto <span className="text-red-500">*</span>
          </label>
          <GmailVariablePicker onInsert={insertIntoSubject} />
        </div>
        <input
          ref={subjectRef}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Assunto do e-mail — use {{nome}}, {{empresa}}, etc."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        />
      </div>

      {/* Corpo */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Corpo <span className="text-red-500">*</span>
          </label>
          <GmailVariablePicker onInsert={insertIntoBody} label="Inserir variável no corpo" />
        </div>
        <RichTextEditor
          ref={editorRef}
          placeholder="Escreva o corpo do template... use {{nome}}, {{empresa}}, {{data}}, etc."
          minHeight={200}
        />
      </div>

      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saving ? "Salvando..." : success ? "Salvo!" : isEditing ? "Salvar alterações" : "Criar template"}
      </button>
    </form>
  );
}
