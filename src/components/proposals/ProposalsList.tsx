"use client";

import { useState } from "react";
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
} from "lucide-react";
import { updateProposalStatus, deleteProposal } from "@/actions/proposals";
import type { ProposalStatus } from "@/actions/proposals";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import ProposalUploadModal from "./ProposalUploadModal";

interface Proposal {
  id: string;
  title: string;
  description: string | null;
  status: string;
  driveFileId: string | null;
  driveUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  sentAt: Date | null;
  createdAt: Date;
}

interface Props {
  proposals: Proposal[];
  leadId?: string;
  dealId?: string;
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

export default function ProposalsList({ proposals: initial, leadId, dealId }: Props) {
  const [proposals, setProposals] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleStatusChange(id: string, status: ProposalStatus) {
    setUpdating(id);
    try {
      await updateProposalStatus(id, status);
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
    if (!confirm("Remover esta proposta? O arquivo no Drive também será excluído.")) return;
    setDeleting(id);
    try {
      await deleteProposal(id);
      setProposals((prev) => prev.filter((p) => p.id !== id));
      toast.success("Proposta removida");
    } catch {
      toast.error("Erro ao remover proposta");
    } finally {
      setDeleting(null);
    }
  }

  function handleCreated() {
    // Re-fetch is handled by revalidatePath on the server; parent page will refresh
    window.location.reload();
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
        <h2 className="text-lg font-bold text-gray-900">
          Propostas ({proposals.length})
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
        >
          <Plus size={15} />
          Nova Proposta
        </button>
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

            return (
              <li
                key={proposal.id}
                className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <FileText size={20} className="mt-0.5 flex-shrink-0 text-purple-500" />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm">{proposal.title}</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.color}`}
                    >
                      {statusCfg.icon}
                      {statusCfg.label}
                    </span>
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

                {/* Ações */}
                <div className="flex flex-shrink-0 items-center gap-2">
                  {proposal.driveUrl && (
                    <a
                      href={proposal.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir no Google Drive"
                      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-200 hover:text-primary"
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}

                  {/* Seletor de status */}
                  {isUpdating ? (
                    <Loader2 size={15} className="animate-spin text-gray-400" />
                  ) : (
                    <select
                      value={proposal.status}
                      onChange={(e) => handleStatusChange(proposal.id, e.target.value as ProposalStatus)}
                      className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-primary focus:outline-none"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {isDeleting ? (
                    <Loader2 size={15} className="animate-spin text-red-400" />
                  ) : (
                    <button
                      onClick={() => handleDelete(proposal.id)}
                      title="Remover proposta"
                      className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
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
    </div>
  );
}
