"use client";

import { useState, useRef } from "react";
import { X, Upload, Loader2, FileText } from "lucide-react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

interface Props {
  leadId?: string;
  dealId?: string;
  onClose: () => void;
  onCreated: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProposalUploadModal({ leadId, dealId, onClose, onCreated }: Props) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Título é obrigatório");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let fileBase64: string | undefined;
      let fileMimeType: string | undefined;
      let fileName: string | undefined;

      if (file) {
        fileBase64 = await fileToBase64(file);
        fileMimeType = file.type;
        fileName = file.name;
      }

      await apiFetch("/proposals", token, {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          leadId,
          dealId,
          fileName,
          fileMimeType,
          fileBase64,
        }),
      });

      toast.success(file ? "Proposta criada e enviada ao Drive" : "Proposta criada");
      onCreated();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar proposta";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > 25 * 1024 * 1024) {
      setError("Arquivo muito grande. Máximo: 25 MB");
      return;
    }
    setFile(selected);
    setError("");
    if (!title) setTitle(selected.name.replace(/\.[^.]+$/, ""));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Nova Proposta</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* Título */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Proposta E-commerce 2026"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Observações sobre a proposta..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Upload de arquivo */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Arquivo (opcional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                <FileText size={18} className="text-green-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-green-800">{file.name}</p>
                  <p className="text-xs text-green-600">{formatBytes(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="text-green-600 hover:text-green-800"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 hover:border-primary hover:text-primary"
              >
                <Upload size={18} />
                Clique para selecionar (PDF, Word, PowerPoint, Excel — máx. 25 MB)
              </button>
            )}
            <p className="mt-1 text-xs text-gray-400">
              O arquivo será salvo no Google Drive em WB-CRM/Propostas/
            </p>
          </div>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          {/* Ações */}
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
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {file ? "Enviando ao Drive..." : "Salvando..."}
                </>
              ) : (
                <>
                  {file ? <Upload size={16} /> : null}
                  {file ? "Salvar no Drive" : "Criar Proposta"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
