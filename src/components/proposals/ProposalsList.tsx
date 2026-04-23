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
  Download,
  Eye,
  MonitorDown,
  Pencil,
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
}

interface Props {
  proposals: Proposal[];
  leadId?: string;
  dealId?: string;
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

export default function ProposalsList({ proposals: initial, leadId, dealId }: Props) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const router = useRouter();
  const [proposals, setProposals] = useState<typeof initial>(initial ?? []);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Proposal | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Proposal | null>(null);

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
            const hasFile = !!proposal.driveFileId;

            return (
              <li
                key={proposal.id}
                className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
              >
                {/* Linha principal */}
                <div className="flex items-start gap-3">
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

                  {/* Seletor de status + editar + delete */}
                  <div className="flex flex-shrink-0 items-center gap-2">
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

                    <button
                      onClick={() => setEditing(proposal)}
                      title="Editar proposta"
                      className="rounded-md p-1.5 text-gray-400 hover:bg-purple-50 hover:text-purple-600"
                    >
                      <Pencil size={15} />
                    </button>

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
                </div>

                {/* Barra de ações do arquivo */}
                {hasFile && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3">
                    {/* 1. Visualizar no CRM */}
                    <button
                      onClick={() => setViewing(proposal)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100"
                    >
                      <Eye size={13} />
                      Visualizar
                    </button>

                    {/* 2. Download para a máquina */}
                    <a
                      href={`${BACKEND_URL}/proposals/${proposal.id}/file?token=${encodeURIComponent(token)}`}
                      download={proposal.fileName ?? true}
                      className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                    >
                      <Download size={13} />
                      Download
                    </a>

                    {/* 3. Abrir com app padrão da máquina */}
                    <a
                      href={`${BACKEND_URL}/proposals/${proposal.id}/file?inline=true&token=${encodeURIComponent(token)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
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
                        className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      >
                        <ExternalLink size={13} />
                        Abrir no Drive
                      </a>
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
    </div>
  );
}
