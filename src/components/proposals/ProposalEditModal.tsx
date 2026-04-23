"use client";

import { useState, useRef } from "react";
import { X, Upload, Loader2, FileText } from "lucide-react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import type { Proposal } from "./ProposalsList";

interface Props {
  proposal: Proposal;
  leadId?: string;
  dealId?: string;
  onClose: () => void;
  onSaved: (updated: Proposal) => void;
}

const STATUS_OPTIONS = [
  { value: "draft",    label: "Rascunho" },
  { value: "sent",     label: "Enviada" },
  { value: "accepted", label: "Aceita" },
  { value: "rejected", label: "Recusada" },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProposalEditModal({ proposal, leadId, dealId, onClose, onSaved }: Props) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [title, setTitle] = useState(proposal.title);
  const [description, setDescription] = useState(proposal.description ?? "");
  const [status, setStatus] = useState(proposal.status);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Título é obrigatório"); return; }

    setLoading(true);
    setError("");

    try {
      let fileBase64: string | undefined;
      let fileMimeType: string | undefined;
      let fileName: string | undefined;

      if (newFile) {
        fileBase64 = await fileToBase64(newFile);
        fileMimeType = newFile.type;
        fileName = newFile.name;
      }

      const updated = await apiFetch<Proposal>(`/proposals/${proposal.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          leadId: leadId ?? proposal.leadId,
          dealId: dealId ?? proposal.dealId,
          fileName,
          fileMimeType,
          fileBase64,
        }),
      });

      toast.success(newFile ? "Proposta atualizada e arquivo enviado ao Drive" : "Proposta atualizada");
      onSaved(updated);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar proposta";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > 25 * 1024 * 1024) { setError("Arquivo muito grande. Máximo: 25 MB"); return; }
    setNewFile(selected);
    setError("");
  }

  const existingFileLabel = proposal.fileName
    ? `${proposal.fileName}${proposal.fileSize ? ` · ${formatBytes(proposal.fileSize)}` : ""}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Editar Proposta</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {existingFileLabel ? "Substituir arquivo (opcional)" : "Arquivo (opcional)"}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
            {newFile ? (
              <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                <FileText size={18} className="text-green-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-green-800">{newFile.name}</p>
                  <p className="text-xs text-green-600">{formatBytes(newFile.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setNewFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="text-green-600 hover:text-green-800"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-4 text-sm text-gray-500 hover:border-primary hover:text-primary"
              >
                <Upload size={18} />
                {existingFileLabel
                  ? `Arquivo atual: ${existingFileLabel} — clique para substituir`
                  : "Clique para selecionar (PDF, Word, PowerPoint, Excel — máx. 25 MB)"}
              </button>
            )}
          </div>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" />{newFile ? "Enviando ao Drive..." : "Salvando..."}</>
              ) : (
                <>{newFile ? <Upload size={16} /> : null}{newFile ? "Salvar e substituir arquivo" : "Salvar alterações"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
