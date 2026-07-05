"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileText,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Loader2,
  Download,
  Eye,
  MonitorDown,
  Pencil,
  BrainCircuit,
  HelpCircle,
  Hourglass,
  WrenchIcon,
  GitBranchPlus,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiFetch, BACKEND_URL } from "@/lib/api-client";

type ProposalStatus = "draft" | "sent" | "accepted" | "rejected";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import ProposalUploadModal from "./ProposalUploadModal";
import ProposalEditModal from "./ProposalEditModal";
import ProposalViewer from "./ProposalViewer";
import {
  ProposalAgentModal,
  ProposalAgentQuestionModal,
  ProposalAgentCompletionDialog,
  ProposalCorrectModal,
  ProposalReviseModal,
} from "./ProposalAgentModal";
import type { LeadContact } from "@/types/lead";

export interface Proposal {
  id: string;
  title: string;
  description: string | null;
  status: string;
  driveFileId: string | null;
  driveUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  sentAt: string | Date | null;
  createdAt: string | Date;
  leadId?: string | null;
  dealId?: string | null;
  // Agent fields
  agentJobId?: string | null;
  agentStatus?: string | null;
  agentCurrentQuestion?: string | null;
  agentTriggeredAt?: string | Date | null;
  // Revision fields
  revisionNumber?: number | null;
  originalProposalId?: string | null;
}

interface Props {
  proposals: Proposal[];
  leadId?: string;
  dealId?: string;
  leadContacts?: LeadContact[];
}

function isNotFound(err: unknown): boolean {
  if (err instanceof Error && err.message.includes("404")) return true;
  if (err instanceof Error && err.message.toLowerCase().includes("not found")) return true;
  return false;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  draft: {
    label: "Rascunho",
    color: "bg-gray-100 text-gray-700",
    icon: <Clock size={12} />,
  },
  sent: {
    label: "Enviada",
    color: "bg-blue-100 text-blue-700",
    icon: <Send size={12} />,
  },
  accepted: {
    label: "Aceita",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle size={12} />,
  },
  rejected: {
    label: "Recusada",
    color: "bg-red-100 text-red-700",
    icon: <XCircle size={12} />,
  },
};

const STATUS_OPTIONS: { value: ProposalStatus; label: string }[] = [
  { value: "draft", label: "Rascunho" },
  { value: "sent", label: "Enviada" },
  { value: "accepted", label: "Aceita" },
  { value: "rejected", label: "Recusada" },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProposalsList({ proposals: initial, leadId, dealId, leadContacts = [] }: Props) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const router = useRouter();
  const [proposals, setProposals] = useState<typeof initial>(initial ?? []);
  const [showModal, setShowModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [editing, setEditing] = useState<Proposal | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Proposal | null>(null);
  const [correcting, setCorrecting] = useState<Proposal | null>(null);
  const [revising, setRevising] = useState<Proposal | null>(null);

  // Agent polling state
  const [agentProposalId, setAgentProposalId] = useState<string | null>(null);
  const [completedProposal, setCompletedProposal] = useState<Proposal | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch latest proposal data for the agent proposal being tracked
  useEffect(() => {
    if (!agentProposalId) return;

    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        router.refresh();
        const updated = await apiFetch<Proposal>(`/proposals/${agentProposalId}`, token);
        setProposals((prev) => {
          const exists = prev.find((p) => p.id === agentProposalId);
          if (exists) return prev.map((p) => p.id === agentProposalId ? updated : p);
          return [updated, ...prev];
        });

        const status = updated.agentStatus;
        if (status === "completed") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setAgentProposalId(null);
          setCompletedProposal(updated);
        } else if (status === "error") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setAgentProposalId(null);
        }
      } catch { /* ignore poll errors */ }

      if (attempts >= 30) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setAgentProposalId(null);
      }
    }, 6000);

    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [agentProposalId, token, router]);

  function handleAgentProposalCreated(proposalId: string) {
    setAgentProposalId(proposalId);
    // Add a placeholder proposal immediately
    const placeholder: Proposal = {
      id: proposalId,
      title: "Gerando com agente IA...",
      description: null,
      status: "draft",
      driveFileId: null,
      driveUrl: null,
      fileName: null,
      fileSize: null,
      sentAt: null,
      createdAt: new Date(),
      leadId: leadId ?? null,
      agentStatus: "processing",
    };
    setProposals((prev) => [placeholder, ...prev.filter((p) => p.id !== proposalId)]);
  }

  // Correction: same proposal ID — update in place, don't add placeholder
  function handleCorrectionStarted(proposalId: string) {
    setAgentProposalId(proposalId);
    setProposals((prev) =>
      prev.map((p) => p.id === proposalId ? { ...p, agentStatus: "processing" } : p)
    );
  }

  // Revision: new proposal ID — add placeholder at top
  function handleRevisionStarted(newProposalId: string, _jobId: string, revisionNumber: number) {
    setAgentProposalId(newProposalId);
    const placeholder: Proposal = {
      id: newProposalId,
      title: `Gerando revisão REV${revisionNumber}...`,
      description: null,
      status: "draft",
      driveFileId: null,
      driveUrl: null,
      fileName: null,
      fileSize: null,
      sentAt: null,
      createdAt: new Date(),
      leadId: leadId ?? null,
      agentStatus: "processing",
      revisionNumber,
    };
    setProposals((prev) => [placeholder, ...prev]);
  }

  function handleQuestionAnswered() {
    // Status will update via polling
    setProposals((prev) => prev.map((p) =>
      p.id === agentProposalId ? { ...p, agentStatus: "processing", agentCurrentQuestion: null } : p
    ));
  }

  async function handleStatusChange(id: string, status: ProposalStatus) {
    setUpdating(id);
    try {
      await apiFetch(`/proposals/${id}`, token, { method: "PATCH", body: JSON.stringify({ status }) });
      setProposals((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status, sentAt: status === "sent" ? new Date() : p.sentAt } : p
        )
      );
      toast.success("Status atualizado");
    } catch {
      toast.error("Erro ao atualizar status");
    } finally {
      setUpdating(null);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const doDelete = async () => {
      try {
        await apiFetch(`/proposals/${id}`, token, { method: "DELETE" });
        setProposals((prev) => prev.filter((p) => p.id !== id));
        toast.success("Proposta removida");
      } catch (err) {
        if (isNotFound(err)) {
          setProposals((prev) => prev.filter((p) => p.id !== id));
          toast.info("Proposta não encontrada no servidor — removida da lista");
        } else {
          toast.error(err instanceof Error ? err.message : "Erro ao remover proposta");
        }
      } finally {
        setDeleting(null);
      }
    };

    toast("Remover esta proposta? O arquivo no Drive também será excluído.", {
      action: { label: "Remover", onClick: doDelete },
      cancel: { label: "Cancelar", onClick: () => setDeleting(null) },
      duration: 8000,
    });
  }

  function handleCreated(created: Proposal) {
    setProposals((prev) => [created, ...prev]);
    router.refresh();
  }

  function handleSaved(updated: Proposal) {
    setProposals((prev) => prev.map((p) => p.id === updated.id ? updated : p));
  }

  return (
    <div className="rounded-lg bg-[#1a0022] p-6 shadow border border-[#3d2b4d]">
      <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
        <h2 className="text-lg font-bold text-gray-900">
          Propostas ({proposals.length})
        </h2>
        <div className="flex items-center gap-2">
          {leadId && (
            <button
              onClick={() => setShowAgentModal(true)}
              className="flex items-center gap-1.5 rounded-md border border-purple-500/50 bg-purple-950/40 px-3 py-1.5 text-sm font-medium text-purple-300 hover:bg-purple-900/50 hover:border-purple-400 transition-colors"
            >
              <BrainCircuit size={15} />
              Gerar com Agente
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Plus size={15} />
            Nova Proposta
          </button>
        </div>
      </div>

      {proposals.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <FileText size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500 mb-3">Nenhuma proposta cadastrada</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Plus size={15} />
            Criar Primeira Proposta
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {proposals.map((proposal) => {
            const statusCfg = STATUS_CONFIG[proposal.status] ?? STATUS_CONFIG.draft;
            const isUpdating = updating === proposal.id;
            const isDeleting = deleting === proposal.id;
            const hasFile = !!proposal.driveFileId;

            return (
              <li
                key={proposal.id}
                className="rounded-lg border border-[#3d2b4d] bg-[#2d1b3d] px-4 py-3"
              >
                {/* Linha principal */}
                <div className="flex items-start gap-3">
                  <FileText size={20} className="mt-0.5 flex-shrink-0 text-purple-500" />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">{proposal.title}</span>
                      {proposal.revisionNumber != null && (
                        <span className="inline-flex items-center rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-300 border border-sky-500/30">
                          REV{proposal.revisionNumber}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.color}`}
                      >
                        {statusCfg.icon}
                        {statusCfg.label}
                      </span>
                      {/* Agent status badges */}
                      {proposal.agentStatus === "processing" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2 py-0.5 text-xs text-purple-400 border border-purple-500/30">
                          <Hourglass size={10} className="animate-pulse" />
                          Agente gerando...
                        </span>
                      )}
                      {proposal.agentStatus === "awaiting_answer" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs text-yellow-400 border border-yellow-500/30">
                          <HelpCircle size={10} />
                          Aguardando resposta
                        </span>
                      )}
                      {proposal.agentStatus === "error" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-400 border border-red-500/30">
                          Erro no agente
                        </span>
                      )}
                    </div>

                    {proposal.description && (
                      <p className="mt-0.5 text-xs text-gray-500">{proposal.description}</p>
                    )}

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      <span>Criada em {formatDate(proposal.createdAt)}</span>
                      {proposal.sentAt && (
                        <span>Enviada em {formatDate(proposal.sentAt)}</span>
                      )}
                      {proposal.fileName && (
                        <span>
                          {proposal.fileName}
                          {proposal.fileSize ? ` · ${formatBytes(proposal.fileSize)}` : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Seletor de status + editar + delete */}
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {isUpdating ? (
                      <Loader2 size={15} className="animate-spin text-gray-400" />
                    ) : (
                      <select
                        value={proposal.status}
                        onChange={(e) => handleStatusChange(proposal.id, e.target.value as ProposalStatus)}
                        className="rounded-md border border-[#3d2b4d] bg-[#2d1b3d] px-2 py-1 text-xs text-gray-300 focus:border-primary focus:outline-none"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}

                    <button
                      onClick={() => setEditing(proposal)}
                      title="Editar proposta"
                      className="rounded-md p-1.5 text-gray-400 hover:bg-purple-500/15 hover:text-purple-400"
                    >
                      <Pencil size={15} />
                    </button>

                    {isDeleting ? (
                      <Loader2 size={15} className="animate-spin text-red-400" />
                    ) : (
                      <button
                        onClick={() => handleDelete(proposal.id)}
                        title="Remover proposta"
                        className="rounded-md p-1.5 text-gray-400 hover:bg-red-500/15 hover:text-red-400"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Barra de ações do arquivo */}
                {hasFile && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3">
                    {/* 1. Visualizar no CRM */}
                    <button
                      onClick={() => setViewing(proposal)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-purple-500/30 bg-purple-500/15 px-3 py-1.5 text-xs font-medium text-purple-300 hover:bg-purple-500/25"
                    >
                      <Eye size={13} />
                      Visualizar
                    </button>

                    {/* 2. Download para a máquina */}
                    <a
                      href={`${BACKEND_URL}/proposals/${proposal.id}/file?token=${encodeURIComponent(token)}`}
                      download={proposal.fileName ?? true}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-[#3d2b4d]"
                    >
                      <Download size={13} />
                      Download
                    </a>

                    {/* 3. Abrir com app padrão da máquina */}
                    <a
                      href={`${BACKEND_URL}/proposals/${proposal.id}/file?inline=true&token=${encodeURIComponent(token)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-[#3d2b4d]"
                    >
                      <MonitorDown size={13} />
                      Abrir com app
                    </a>

                    {/* 4. Abrir no Google Drive */}
                    {proposal.driveUrl && (
                      <a
                        href={proposal.driveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-blue-500/30 bg-blue-500/15 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-500/25"
                      >
                        <ExternalLink size={13} />
                        Abrir no Drive
                      </a>
                    )}

                    {/* 5. Corrigir com agente (só quando não está processando) */}
                    {proposal.agentStatus !== "processing" && (
                      <button
                        onClick={() => setCorrecting(proposal)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-300 hover:bg-orange-500/20"
                        title="Pedir ao agente que corrija esta proposta"
                      >
                        <WrenchIcon size={13} />
                        Corrigir
                      </button>
                    )}

                    {/* 6. Revisão com agente (só quando não está processando) */}
                    {proposal.agentStatus !== "processing" && (
                      <button
                        onClick={() => setRevising(proposal)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-500/20"
                        title="Criar nova versão revisada desta proposta"
                      >
                        <GitBranchPlus size={13} />
                        Revisão
                        {proposal.revisionNumber != null && (
                          <span className="ml-0.5 rounded bg-sky-500/20 px-1 text-[10px] font-semibold">
                            REV{proposal.revisionNumber}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showModal && (
        <ProposalUploadModal
          leadId={leadId}
          dealId={dealId}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}

      {editing && (
        <ProposalEditModal
          proposal={editing}
          leadId={leadId}
          dealId={dealId}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      {viewing && (
        <ProposalViewer
          proposalId={viewing.id}
          fileName={viewing.fileName}
          onClose={() => setViewing(null)}
        />
      )}

      {showAgentModal && leadId && (
        <ProposalAgentModal
          leadId={leadId}
          leadContacts={leadContacts}
          onClose={() => setShowAgentModal(false)}
          onProposalCreated={handleAgentProposalCreated}
        />
      )}

      {/* Question modal: show for the proposal currently being tracked */}
      {(() => {
        if (!agentProposalId) return null;
        const tracked = proposals.find((p) => p.id === agentProposalId);
        if (!tracked || tracked.agentStatus !== "awaiting_answer" || !tracked.agentCurrentQuestion) return null;
        return (
          <ProposalAgentQuestionModal
            question={tracked.agentCurrentQuestion}
            proposalId={agentProposalId}
            onAnswered={handleQuestionAnswered}
            onClose={() => {
              // Don't close—user must answer. Allow dismiss to just hide the modal
              setAgentProposalId(null);
            }}
          />
        );
      })()}

      {completedProposal && (
        <ProposalAgentCompletionDialog
          proposalTitle={completedProposal.title}
          driveUrl={completedProposal.driveUrl}
          onClose={() => setCompletedProposal(null)}
        />
      )}

      {correcting && (
        <ProposalCorrectModal
          proposalId={correcting.id}
          proposalTitle={correcting.title}
          onClose={() => setCorrecting(null)}
          onStarted={handleCorrectionStarted}
        />
      )}

      {revising && (
        <ProposalReviseModal
          proposalId={revising.id}
          proposalTitle={revising.title}
          onClose={() => setRevising(null)}
          onStarted={handleRevisionStarted}
        />
      )}
    </div>
  );
}
