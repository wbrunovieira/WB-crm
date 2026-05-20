"use client";

import { useState } from "react";
import { X, Loader2, BrainCircuit, MessageSquare, CheckCircle2, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import type { LeadContact } from "@/types/lead";

type Gender = "male" | "female" | "unknown";
type Brand = "wb" | "salto";

interface SelectedContact {
  id: string;
  name: string;
  gender: Gender;
}

interface Props {
  leadId: string;
  leadContacts: LeadContact[];
  onClose: () => void;
  onProposalCreated: (proposalId: string, jobId: string) => void;
}

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "Sr." },
  { value: "female", label: "Sra." },
  { value: "unknown", label: "—" },
];

const BRAND_OPTIONS: { value: Brand; label: string; description: string }[] = [
  { value: "wb", label: "WB Digital Solutions", description: "Proposta técnica / soluções digitais" },
  { value: "salto", label: "Salto", description: "Proposta comercial / consultoria" },
];

export function ProposalAgentModal({ leadId, leadContacts, onClose, onProposalCreated }: Props) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";

  const [brand, setBrand] = useState<Brand>("wb");
  const [selected, setSelected] = useState<SelectedContact[]>([]);
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleContact(contact: LeadContact) {
    setSelected((prev) => {
      const exists = prev.find((s) => s.id === contact.id);
      if (exists) return prev.filter((s) => s.id !== contact.id);
      return [...prev, { id: contact.id, name: contact.name, gender: "unknown" }];
    });
  }

  function setGender(id: string, gender: Gender) {
    setSelected((prev) => prev.map((s) => s.id === id ? { ...s, gender } : s));
  }

  async function handleSubmit() {
    if (selected.length === 0) {
      toast.warning("Selecione ao menos um contato para a proposta");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<{ status: string; proposalId: string; jobId: string }>(
        `/leads/${leadId}/proposal-agent`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            brand,
            contacts: selected.map((s) => ({ name: s.name, gender: s.gender })),
            instructions: instructions.trim() || undefined,
          }),
        },
      );
      onProposalCreated(res.proposalId, res.jobId);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao acionar o agente");
      setLoading(false);
    }
  }

  const activeContacts = leadContacts.filter((c) => !c.isArchived && c.isActive !== false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border border-[#3d2b4d] bg-[#1a0022] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3d2b4d] px-6 py-4">
          <div className="flex items-center gap-2">
            <BrainCircuit size={20} className="text-purple-400" />
            <h2 className="text-base font-semibold text-gray-100">Gerar Proposta com Agente IA</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Brand */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Marca da proposta</label>
            <div className="grid grid-cols-2 gap-3">
              {BRAND_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setBrand(opt.value)}
                  className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                    brand === opt.value
                      ? "border-purple-500 bg-purple-950/60 text-purple-100"
                      : "border-[#3d2b4d] bg-[#2d1b3d] text-gray-300 hover:border-purple-700"
                  }`}
                >
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="mt-0.5 text-xs text-gray-400">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Contacts */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Contatos destinatários
              <span className="ml-1 text-xs text-gray-500">(selecione e defina tratamento)</span>
            </label>
            {activeContacts.length === 0 ? (
              <p className="rounded-lg border border-[#3d2b4d] px-4 py-3 text-sm text-gray-500">
                Nenhum contato ativo neste lead
              </p>
            ) : (
              <div className="space-y-2">
                {activeContacts.map((contact) => {
                  const sel = selected.find((s) => s.id === contact.id);
                  const isChecked = !!sel;
                  return (
                    <div
                      key={contact.id}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors cursor-pointer ${
                        isChecked
                          ? "border-purple-500/60 bg-purple-950/30"
                          : "border-[#3d2b4d] bg-[#2d1b3d] hover:border-purple-700/50"
                      }`}
                      onClick={() => toggleContact(contact)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleContact(contact)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 accent-purple-500 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-200">{contact.name}</span>
                        {contact.role && (
                          <span className="ml-1.5 text-xs text-gray-500">· {contact.role}</span>
                        )}
                      </div>
                      {isChecked && (
                        <select
                          value={sel.gender}
                          onChange={(e) => { e.stopPropagation(); setGender(contact.id, e.target.value as Gender); }}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border border-[#3d2b4d] bg-[#1a0022] px-2 py-1 text-xs text-gray-300 focus:border-purple-500 focus:outline-none"
                        >
                          {GENDER_OPTIONS.map((g) => (
                            <option key={g.value} value={g.value}>{g.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Instruções adicionais
              <span className="ml-1 text-xs text-gray-500">(opcional)</span>
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Ex: Foco em automação industrial, prazo de 3 meses, budget até R$ 50k..."
              rows={3}
              className="w-full rounded-lg border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:border-purple-500 focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#3d2b4d] px-6 py-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-[#3d2b4d] px-4 py-2 text-sm text-gray-300 hover:bg-white/5 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || selected.length === 0}
            className="flex items-center gap-2 rounded-lg bg-purple-700 px-5 py-2 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <BrainCircuit size={15} />
                Gerar com Agente
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Question modal: shown when agent asks a question
interface QuestionModalProps {
  question: string;
  proposalId: string;
  onAnswered: (answer: string) => void;
  onClose: () => void;
}

export function ProposalAgentQuestionModal({ question, proposalId, onAnswered, onClose }: QuestionModalProps) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  void proposalId;

  async function handleSubmit() {
    if (!answer.trim()) return;
    setLoading(true);
    try {
      await apiFetch(`/proposals/${proposalId}/agent-answer`, token, {
        method: "POST",
        body: JSON.stringify({ answer: answer.trim() }),
      });
      onAnswered(answer.trim());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar resposta");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-[#3d2b4d] bg-[#1a0022] shadow-2xl">
        <div className="flex items-center gap-2 border-b border-[#3d2b4d] px-6 py-4">
          <MessageSquare size={18} className="text-yellow-400" />
          <h2 className="text-base font-semibold text-gray-100">Pergunta do Agente</h2>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 px-4 py-3 text-sm text-yellow-200 leading-relaxed">
            {question}
          </p>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Sua resposta</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Digite sua resposta..."
              rows={4}
              autoFocus
              className="w-full rounded-lg border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:border-purple-500 focus:outline-none resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
              }}
            />
            <p className="mt-1 text-xs text-gray-600">Ctrl+Enter para enviar</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#3d2b4d] px-6 py-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-[#3d2b4d] px-4 py-2 text-sm text-gray-300 hover:bg-white/5 disabled:opacity-50"
          >
            Fechar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !answer.trim()}
            className="flex items-center gap-2 rounded-lg bg-yellow-600 px-5 py-2 text-sm font-medium text-white hover:bg-yellow-500 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            Responder
          </button>
        </div>
      </div>
    </div>
  );
}

// Completion dialog: requires user to click OK to dismiss
interface CompletionDialogProps {
  proposalTitle: string;
  driveUrl?: string | null;
  onClose: () => void;
}

export function ProposalAgentCompletionDialog({ proposalTitle, driveUrl, onClose }: CompletionDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-xl border border-green-500/40 bg-[#1a0022] shadow-2xl">
        <div className="px-6 py-8 text-center space-y-4">
          <CheckCircle2 size={48} className="mx-auto text-green-400" />
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Proposta Gerada!</h2>
            <p className="mt-1 text-sm text-gray-400 line-clamp-2">{proposalTitle}</p>
          </div>
          {driveUrl && (
            <a
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 hover:underline"
            >
              Abrir no Google Drive
            </a>
          )}
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-600 transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

// Error status indicator
export function ProposalAgentErrorBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-400 border border-red-500/30">
      <AlertCircle size={11} />
      Erro no agente
    </span>
  );
}

// Correct Proposal modal
interface CorrectModalProps {
  proposalId: string;
  proposalTitle: string;
  onClose: () => void;
  onStarted: (proposalId: string, jobId: string) => void;
}

export function ProposalCorrectModal({ proposalId, proposalTitle, onClose, onStarted }: CorrectModalProps) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!instructions.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ status: string; proposalId: string; jobId: string }>(
        `/proposals/${proposalId}/agent-correct`,
        token,
        { method: "POST", body: JSON.stringify({ instructions: instructions.trim() }) },
      );
      onStarted(res.proposalId, res.jobId);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao acionar correção");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-[#3d2b4d] bg-[#1a0022] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#3d2b4d] px-6 py-4">
          <div className="flex items-center gap-2">
            <BrainCircuit size={18} className="text-orange-400" />
            <h2 className="text-base font-semibold text-gray-100">Corrigir Proposta</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-400 line-clamp-1">
            <span className="text-gray-500">Proposta:</span>{" "}
            <span className="text-gray-300">{proposalTitle}</span>
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              O que precisa ser corrigido?
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Ex: Reduza o prazo para 5 dias úteis, ajuste o valor para R$ 1.200..."
              rows={4}
              autoFocus
              className="w-full rounded-lg border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:border-purple-500 focus:outline-none resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
              }}
            />
            <p className="mt-1 text-xs text-gray-600">Ctrl+Enter para enviar</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#3d2b4d] px-6 py-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-[#3d2b4d] px-4 py-2 text-sm text-gray-300 hover:bg-white/5 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !instructions.trim()}
            className="flex items-center gap-2 rounded-lg bg-orange-700 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <BrainCircuit size={15} />}
            {loading ? "Enviando..." : "Corrigir com Agente"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Revise Proposal modal
interface ReviseModalProps {
  proposalId: string;
  proposalTitle: string;
  onClose: () => void;
  onStarted: (newProposalId: string, jobId: string, revisionNumber: number) => void;
}

export function ProposalReviseModal({ proposalId, proposalTitle, onClose, onStarted }: ReviseModalProps) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [revisionNotes, setRevisionNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!revisionNotes.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ status: string; proposalId: string; jobId: string; revisionNumber: number }>(
        `/proposals/${proposalId}/agent-revise`,
        token,
        { method: "POST", body: JSON.stringify({ revisionNotes: revisionNotes.trim() }) },
      );
      onStarted(res.proposalId, res.jobId, res.revisionNumber);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao acionar revisão");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-[#3d2b4d] bg-[#1a0022] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#3d2b4d] px-6 py-4">
          <div className="flex items-center gap-2">
            <BrainCircuit size={18} className="text-blue-400" />
            <h2 className="text-base font-semibold text-gray-100">Revisão de Proposta</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-400 line-clamp-1">
            <span className="text-gray-500">Proposta:</span>{" "}
            <span className="text-gray-300">{proposalTitle}</span>
          </p>
          <p className="text-xs text-blue-400/80 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
            Será criada uma nova versão da proposta com número de revisão incrementado (REV1, REV2...).
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Notas de revisão
            </label>
            <textarea
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="Ex: Cliente pediu desconto de 10% e prazo de 30 dias no pagamento..."
              rows={4}
              autoFocus
              className="w-full rounded-lg border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:border-purple-500 focus:outline-none resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
              }}
            />
            <p className="mt-1 text-xs text-gray-600">Ctrl+Enter para enviar</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#3d2b4d] px-6 py-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-[#3d2b4d] px-4 py-2 text-sm text-gray-300 hover:bg-white/5 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !revisionNotes.trim()}
            className="flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <BrainCircuit size={15} />}
            {loading ? "Enviando..." : "Criar Revisão"}
          </button>
        </div>
      </div>
    </div>
  );
}
