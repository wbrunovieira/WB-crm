"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";

interface WhatsAppTemplateFormProps {
  template?: {
    id: string;
    name: string;
    text: string;
    category: string | null;
    active: boolean;
  };
  onSuccess?: () => void;
}

export function WhatsAppTemplateForm({ template, onSuccess }: WhatsAppTemplateFormProps) {
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken ?? "";
  const [name, setName] = useState(template?.name ?? "");
  const [text, setText] = useState(template?.text ?? "");
  const [category, setCategory] = useState(template?.category ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (template) {
        await apiFetch(`/whatsapp/templates/${template.id}`, token, { method: "PATCH", body: JSON.stringify({ name, text, category }) });
        toast.success("Template atualizado");
      } else {
        await apiFetch("/whatsapp/templates", token, { method: "POST", body: JSON.stringify({ name, text, category }) });
        toast.success("Template criado");
        setName("");
        setText("");
        setCategory("");
      }
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar template");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Nome <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex: Boas-vindas, Follow-up 3 dias"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/20"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Categoria
        </label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="ex: vendas, suporte, cobrança"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/20"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Mensagem <span className="text-red-500">*</span>
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite a mensagem do template..."
          rows={5}
          className="mt-1 w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/20"
          required
          disabled={loading}
        />
        <p className="mt-1 text-xs text-gray-400">{text.length} caracteres</p>
      </div>

      <button
        type="submit"
        disabled={loading || !name.trim() || !text.trim()}
        className="w-full rounded-md bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:bg-[#20b958] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Salvando..." : template ? "Atualizar Template" : "Criar Template"}
      </button>
    </form>
  );
}
