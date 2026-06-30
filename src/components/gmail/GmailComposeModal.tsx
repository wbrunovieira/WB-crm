"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { X, Send, Loader2, Paperclip, FileText, ChevronDown, LayoutTemplate, Maximize2, Minimize2, Clock } from "lucide-react";
import { applyVariables } from "@/lib/gmail-variables";
import { apiFetch } from "@/lib/api-client";
import RichTextEditor, { RichTextEditorHandle } from "@/components/gmail/RichTextEditor";

interface SendAsAlias {
  email: string;
  displayName: string;
  isDefault: boolean;
  isPrimary: boolean;
}

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

/** Formats a Date as the local "YYYY-MM-DDTHH:MM" value a datetime-local input expects. */
function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  senderName?: string;
  contactId?: string;
  leadId?: string;
  organizationId?: string;
  dealId?: string;
  threadId?: string;
  initialSubject?: string;
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
  senderName,
  contactId,
  leadId,
  organizationId,
  dealId,
  threadId,
  initialSubject,
  onClose,
}: GmailComposeModalProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [subject, setSubject] = useState(initialSubject ?? "");
  const [cc, setCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [aliases, setAliases] = useState<SendAsAlias[]>([]);
  const [fromEmail, setFromEmail] = useState<string>("");
  const [expanded, setExpanded] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const editorRef = useRef<RichTextEditorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega aliases e templates ao abrir o modal
  useEffect(() => {
    if (!token) return;
    apiFetch<TemplateOption[]>("/email/templates?onlyActive=true", token)
      .then(setTemplates)
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ aliases: SendAsAlias[] }>("/email/aliases", token)
      .then(({ aliases: list }) => {
        setAliases(list);
        // Não selecionar conta automaticamente quando há mais de uma — o
        // usuário precisa escolher de propósito para não enviar pela conta
        // errada. Com uma única conta não há ambiguidade, então pré-seleciona.
        if (list.length === 1) setFromEmail(list[0].email);
      })
      .catch(() => {});
  }, [token]);

  function applyTemplate(template: TemplateOption) {
    const values = {
      nome: name,
      email: to,
      empresa: companyName ?? "",
      usuario: senderName ?? "",
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

    if (aliases.length > 0 && !fromEmail) {
      setError('Selecione a conta de envio no campo "De" antes de enviar.');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const rawHtml = editorRef.current?.getHTML() ?? "";
      const html = `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.5;">${rawHtml}</div>`;

      // The backend creates the outbound activity itself (single source of truth
      // for the send log, so a later bounce can be reconciled to it). Pass the
      // entity refs so the activity links to the right lead/contact/org/deal.
      const result = await apiFetch<{ ok: boolean; messageId: string; threadId: string; trackingToken: string; activityId?: string; error?: string }>(
        "/email/send",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            to,
            subject: subject.trim(),
            bodyHtml: html,
            fromEmail: fromEmail || undefined,
            threadId,
            attachments: attachments.length > 0 ? attachments : undefined,
            contactIds: contactId ? [contactId] : undefined,
            leadId,
            organizationId,
            dealId,
          }),
        },
      );

      if (!result.ok || !result.messageId) {
        setError(result.error ?? "Falha ao enviar e-mail.");
        return;
      }

      // Mark thread as replied if replying
      if (threadId) {
        apiFetch("/activities/mark-thread-replied", token, {
          method: "PATCH",
          body: JSON.stringify({ threadId }),
        }).catch(() => {});
      }

      setSent(true);
      router.refresh();
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSending(false);
    }
  }

  async function handleSchedule() {
    const bodyEmpty = editorRef.current?.isEmpty() ?? true;
    if (!subject.trim() || bodyEmpty) {
      setError("Preencha o assunto e o corpo do e-mail.");
      return;
    }
    if (aliases.length > 0 && !fromEmail) {
      setError('Selecione a conta de envio no campo "De" antes de agendar.');
      return;
    }
    if (!scheduleAt) {
      setError("Escolha a data e a hora do envio.");
      return;
    }
    const when = new Date(scheduleAt); // datetime-local is parsed as local time
    if (isNaN(when.getTime())) {
      setError("Data/hora inválida.");
      return;
    }
    if (when.getTime() <= Date.now()) {
      setError("O horário de envio deve ser no futuro.");
      return;
    }

    setScheduling(true);
    setError(null);

    try {
      const rawHtml = editorRef.current?.getHTML() ?? "";
      const html = `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.5;">${rawHtml}</div>`;

      const result = await apiFetch<{ ok: boolean; scheduledEmailId?: string; activityId?: string | null; error?: string }>(
        "/email/schedule",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            to,
            subject: subject.trim(),
            bodyHtml: html,
            scheduledSendAt: when.toISOString(), // local pick → UTC instant
            fromEmail: fromEmail || undefined,
            threadId,
            attachments: attachments.length > 0 ? attachments : undefined,
            contactIds: contactId ? [contactId] : undefined,
            leadId,
            organizationId,
            dealId,
          }),
        },
      );

      if (!result.ok) {
        setError(result.error ?? "Falha ao agendar o e-mail.");
        return;
      }

      setShowSchedule(false);
      setScheduled(true);
      router.refresh();
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setScheduling(false);
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
    <div
      className={`fixed inset-0 z-50 flex p-4 ${
        expanded ? "items-center justify-center" : "items-end justify-end sm:p-6"
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Modal — estilo Gmail (canto inferior direito) ou expandido (centralizado) */}
      <div
        className={`relative z-10 flex flex-col bg-white shadow-2xl ring-1 ring-gray-200 ${
          expanded
            ? "h-[88vh] w-[92vw] max-w-3xl rounded-xl"
            : "w-full max-w-xl rounded-t-xl"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-xl bg-gray-800 px-4 py-2">
          <span className="text-sm font-medium text-white truncate">
            Nova mensagem para <span className="text-blue-300">{name}</span>
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "Recolher" : "Expandir"}
              className="text-gray-300 hover:text-white transition-colors p-0.5"
            >
              {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button onClick={onClose} className="text-gray-300 hover:text-white transition-colors p-0.5">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* De (alias selector — só mostra se houver mais de 1) */}
        {aliases.length > 1 && (
          <>
            <div
              className={`flex items-center gap-2 border-b px-3 py-2 text-sm ${
                !fromEmail ? "bg-red-50" : ""
              }`}
            >
              <span
                className={`w-8 ${
                  !fromEmail ? "font-semibold text-red-600" : "text-gray-500"
                }`}
              >
                De
              </span>
              <select
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                disabled={sending || sent}
                className={`flex-1 bg-transparent text-sm outline-none cursor-pointer ${
                  !fromEmail ? "font-semibold text-red-600" : "text-gray-900"
                }`}
              >
                <option value="" disabled>
                  Selecione a conta de envio…
                </option>
                {aliases.map((a) => (
                  <option key={a.email} value={a.email}>
                    {a.displayName ? `${a.displayName} <${a.email}>` : a.email}
                  </option>
                ))}
              </select>
            </div>
            {!fromEmail && (
              <div className="border-b border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">
                ⚠️ Nenhuma conta selecionada — escolha de qual e-mail você vai
                enviar antes de continuar.
              </div>
            )}
          </>
        )}

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
        <div className={`px-3 py-2 ${expanded ? "flex-1 min-h-0" : ""}`}>
          <RichTextEditor
            ref={editorRef}
            onKeyDown={handleKeyDown}
            minHeight={expanded ? undefined : 240}
            fillHeight={expanded}
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
        {scheduled && (
          <p className="mx-3 mb-2 rounded bg-purple-50 px-3 py-2 text-xs text-purple-700 font-medium">
            E-mail agendado com sucesso!
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-3 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSend}
              disabled={sending || sent || scheduling || scheduled}
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

            {/* Schedule send */}
            <div className="relative">
              <button
                type="button"
                title="Agendar envio"
                onClick={() => {
                  setShowSchedule((v) => !v);
                  if (!scheduleAt) {
                    // default: 1h from now, rounded to the minute
                    setScheduleAt(toDatetimeLocalValue(new Date(Date.now() + 60 * 60 * 1000)));
                  }
                }}
                disabled={sending || sent || scheduling || scheduled}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                <ChevronDown className={`h-3 w-3 transition-transform ${showSchedule ? "rotate-180" : ""}`} />
              </button>

              {showSchedule && (
                <div className="absolute bottom-full left-0 mb-1 z-50 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Agendar envio
                  </p>
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    min={toDatetimeLocalValue(new Date())}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleSchedule}
                    disabled={scheduling || !scheduleAt}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
                  >
                    {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                    {scheduling ? "Agendando..." : "Agendar envio"}
                  </button>
                </div>
              )}
            </div>

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
