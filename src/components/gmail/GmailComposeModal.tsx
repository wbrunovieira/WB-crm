"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { X, Send, Loader2, Paperclip, FileText, ChevronDown, LayoutTemplate } from "lucide-react";
import { sendGmailMessage } from "@/actions/gmail";
import { getActiveGmailTemplates } from "@/actions/gmail-templates";
import { applyVariables } from "@/lib/gmail-variables";
import RichTextEditor, { RichTextEditorHandle } from "@/components/gmail/RichTextEditor";

interface AttachmentFile {
  filename: string;
  mimeType: string;
  data: string; // base64
  size: number;
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
      // result is "data:mime;base64,XXX" — strip prefix
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface GmailComposeModalProps {
  to: string;
  name: string;
  companyName?: string;
  contactId?: string;
  leadId?: string;
  organizationId?: string;
  dealId?: string;
  onClose: () => void;
}

interface TemplateOption {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string | null;
}

export default function GmailComposeModal({
  to,
  name,
  companyName,
  contactId,
  leadId,
  organizationId,
  dealId,
  onClose,
}: GmailComposeModalProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [subject, setSubject] = useState("");
  const [cc, setCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const editorRef = useRef<RichTextEditorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega templates ativos ao abrir o modal
  useEffect(() => {
    getActiveGmailTemplates().then(setTemplates).catch(() => {});
  }, []);

  function applyTemplate(template: TemplateOption) {
    const values = {
      nome: name,
      email: to,
      empresa: companyName ?? "",
      usuario: session?.user?.name ?? "",
    };
    setSubject(applyVariables(template.subject, values));
    editorRef.current?.setHTML(applyVariables(template.body, values));
    setShowTemplates(false);
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const MAX_FILE_MB = 15;
    const MAX_TOTAL_MB = 20;
    const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
    const MAX_TOTAL_BYTES = MAX_TOTAL_MB * 1024 * 1024;

    const oversized = files.find((f) => f.size > MAX_FILE_BYTES);
    if (oversized) {
      setError(
        `O arquivo "${oversized.name}" tem ${formatBytes(oversized.size)} e excede o limite de ${MAX_FILE_MB} MB por arquivo.`
      );
      e.target.value = "";
      return;
    }

    const currentTotal = attachments.reduce((sum, a) => sum + a.size, 0);
    const newTotal = currentTotal + files.reduce((sum, f) => sum + f.size, 0);
    if (newTotal > MAX_TOTAL_BYTES) {
      setError(
        `O total dos anexos (${formatBytes(newTotal)}) excede o limite de ${MAX_TOTAL_MB} MB por e-mail.`
      );
      e.target.value = "";
      return;
    }

    const converted = await Promise.all(
      files.map(async (f) => ({
        filename: f.name,
        mimeType: f.type || "application/octet-stream",
        data: await fileToBase64(f),
        size: f.size,
      }))
    );
    setAttachments((prev) => [...prev, ...converted]);
    e.target.value = "";
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSend() {
    const bodyEmpty = editorRef.current?.isEmpty() ?? true;
    if (!subject.trim() || bodyEmpty) {
      setError("Preencha o assunto e o corpo do e-mail.");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const rawHtml = editorRef.current?.getHTML() ?? "";
      const html = `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.5;">${rawHtml}</div>`;

      const result = await sendGmailMessage({
        to,
        subject: subject.trim(),
        html,
        contactId,
        leadId,
        organizationId,
        dealId,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      if (!result) {
        setError("Erro de comunicação com o servidor. Tente novamente.");
        return;
      }

      if (result.success) {
        setSent(true);
        router.refresh();
        setTimeout(onClose, 1500);
      } else {
        setError(result.error ?? "Falha ao enviar e-mail.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Modal — estilo Gmail (canto inferior direito) */}
      <div className="relative z-10 flex w-full max-w-lg flex-col rounded-t-xl bg-white shadow-2xl ring-1 ring-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-xl bg-gray-800 px-4 py-2">
          <span className="text-sm font-medium text-white">
            Nova mensagem para <span className="text-blue-300">{name}</span>
          </span>
          <button onClick={onClose} className="text-gray-300 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* To */}
        <div className="flex items-center gap-2 border-b px-3 py-2 text-sm">
          <span className="text-gray-500 w-8">Para</span>
          <span className="flex-1 text-gray-900">{to}</span>
          <button
            onClick={() => setShowCc(!showCc)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            {showCc ? "Cc −" : "Cc +"}
          </button>
        </div>

        {/* CC */}
        {showCc && (
          <div className="flex items-center gap-2 border-b px-3 py-2 text-sm">
            <span className="text-gray-500 w-8">Cc</span>
            <input
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="E-mails separados por vírgula"
              className="flex-1 outline-none text-sm text-gray-900"
            />
          </div>
        )}

        {/* Subject */}
        <div className="border-b px-3 py-2">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Assunto"
            className="w-full text-sm text-gray-900 outline-none placeholder:text-gray-400"
            autoFocus
          />
        </div>

        {/* Body */}
        <div className="flex-1 px-3 py-2">
          <RichTextEditor
            ref={editorRef}
            onKeyDown={handleKeyDown}
            minHeight={200}
          />
        </div>

        {/* Attachments list */}
        {attachments.length > 0 && (
          <div className="mx-3 mb-1 flex flex-wrap gap-1.5">
            {attachments.map((att, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700"
              >
                <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="max-w-[140px] truncate">{att.filename}</span>
                <span className="text-gray-400">({formatBytes(att.size)})</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mx-3 mb-2 rounded bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        )}

        {/* Success */}
        {sent && (
          <p className="mx-3 mb-2 rounded bg-green-50 px-3 py-2 text-xs text-green-700 font-medium">
            E-mail enviado com sucesso!
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-3 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSend}
              disabled={sending || sent}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {sending ? "Enviando..." : "Enviar"}
              {!sending && <span className="ml-1 text-xs opacity-70">Ctrl+Enter</span>}
            </button>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
            />
            <button
              type="button"
              title="Anexar arquivo"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || sent}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            {/* Template picker */}
            {templates.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  title="Usar template"
                  onClick={() => setShowTemplates((v) => !v)}
                  disabled={sending || sent}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
                >
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  Templates
                  <ChevronDown className={`h-3 w-3 transition-transform ${showTemplates ? "rotate-180" : ""}`} />
                </button>

                {showTemplates && (
                  <div className="absolute bottom-full left-0 mb-1 z-50 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div className="border-b px-3 py-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Selecionar template
                      </p>
                    </div>
                    <ul className="max-h-56 overflow-y-auto py-1">
                      {templates.map((t) => (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => applyTemplate(t)}
                            className="flex w-full flex-col px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                          >
                            <span className="text-sm font-medium text-gray-800">{t.name}</span>
                            {t.category && (
                              <span className="text-xs text-gray-400">{t.category}</span>
                            )}
                            <span className="truncate text-xs text-gray-500">{t.subject}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Descartar
          </button>
        </div>
      </div>
    </div>
  );
}
