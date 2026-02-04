"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Trash2,
  FileText,
  Users,
  Building2,
  History,
  ChevronRight,
  ChevronDown,
  Target
} from "lucide-react";
import { deleteICP, updateICP } from "@/actions/icps";

interface ICP {
  id: string;
  name: string;
  slug: string;
  content: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    id: string;
    name: string | null;
  };
  _count: {
    leads: number;
    organizations: number;
    versions: number;
  };
}

interface ICPsListProps {
  icps: ICP[];
}

const statusConfig: Record<string, { label: string; color: string; hoverColor: string; dotColor: string }> = {
  draft: {
    label: "Rascunho",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    hoverColor: "group-hover:bg-white/20 group-hover:text-white group-hover:border-white/30",
    dotColor: "bg-gray-400"
  },
  active: {
    label: "Ativo",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    hoverColor: "group-hover:bg-emerald-500/30 group-hover:text-emerald-100 group-hover:border-emerald-400/30",
    dotColor: "bg-emerald-500"
  },
  archived: {
    label: "Arquivado",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    hoverColor: "group-hover:bg-amber-500/30 group-hover:text-amber-100 group-hover:border-amber-400/30",
    dotColor: "bg-amber-500"
  },
};

function ICPCard({ icp, loading, onToggleStatus, onDelete }: {
  icp: ICP;
  loading: string | null;
  onToggleStatus: (icp: ICP) => void;
  onDelete: (icp: ICP) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = statusConfig[icp.status] || statusConfig.draft;

  // Check if content is long enough to need expansion
  const contentLines = icp.content.split('\n');
  const isLongContent = icp.content.length > 150 || contentLines.length > 3;

  return (
    <div
      className={`rounded-xl overflow-hidden shadow-md transition-all duration-300 ${
        icp.status === "archived" ? "opacity-60" : ""
      }`}
    >
      {/* ========== HEADER - Primary (White bg, purple accent) ========== */}
      <Link
        href={`/admin/icps/${icp.id}`}
        className="group block bg-white border-l-4 border-l-[#792990] hover:bg-[#792990] transition-all duration-300"
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Title row */}
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-white transition-colors duration-200">
                  {icp.name}
                </h3>
                <ChevronRight className="h-5 w-5 text-[#792990] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-white transition-all duration-200" />

                {/* Status badge */}
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-200 ${status.color} ${status.hoverColor}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dotColor}`} />
                  {status.label}
                </span>
              </div>

              {/* Slug */}
              <p className="mt-1 text-sm font-mono text-[#792990] group-hover:text-white/70 transition-colors duration-200">
                /{icp.slug}
              </p>

              {/* Stats */}
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <span className="inline-flex items-center gap-1.5 text-gray-600 group-hover:text-white/90 transition-colors">
                  <Users className="h-4 w-4" />
                  <strong>{icp._count.leads}</strong> leads
                </span>
                <span className="inline-flex items-center gap-1.5 text-gray-600 group-hover:text-white/90 transition-colors">
                  <Building2 className="h-4 w-4" />
                  <strong>{icp._count.organizations}</strong> orgs
                </span>
                <span className="inline-flex items-center gap-1.5 text-gray-600 group-hover:text-white/90 transition-colors">
                  <History className="h-4 w-4" />
                  v{icp._count.versions}
                </span>
                <span className="text-gray-400 group-hover:text-white/60 transition-colors">
                  {icp.owner.name || "Desconhecido"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-start gap-1 shrink-0">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleStatus(icp); }}
                disabled={loading === icp.id}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-[#792990] group-hover:text-white/70 group-hover:hover:text-white group-hover:hover:bg-white/20 disabled:opacity-50 transition-all"
                title={icp.status === "active" ? "Arquivar" : "Ativar"}
              >
                {icp.status === "active" ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(icp); }}
                disabled={loading === icp.id}
                className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 group-hover:text-white/70 group-hover:hover:text-red-200 group-hover:hover:bg-red-500/30 disabled:opacity-50 transition-all"
                title="Excluir"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </Link>

      {/* ========== CONTENT - Secondary (Purple dark bg for contrast) ========== */}
      <div className="bg-[#2d1f33] text-purple-100">
        {/* Toggle header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-5 py-3 flex items-center justify-between text-sm hover:bg-[#3d2a45] transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-300" />
            <span className="font-medium text-purple-200">Conteúdo do ICP</span>
            {isLongContent && !isExpanded && (
              <span className="text-xs text-purple-400">• expandir</span>
            )}
          </div>
          {isLongContent && (
            <span className={`p-1.5 rounded-full transition-all duration-200 ${isExpanded ? 'bg-[#792990] text-white' : 'bg-[#4a3252] text-purple-300'}`}>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </span>
          )}
        </button>

        {/* Content body */}
        <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? "max-h-[3000px]" : "max-h-24"}`}>
          <div className={`px-5 pb-5 ${!isExpanded && isLongContent ? "relative" : ""}`}>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-purple-100">
              {icp.content}
            </pre>

            {!isExpanded && isLongContent && (
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#2d1f33] to-transparent pointer-events-none" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ICPsList({ icps }: ICPsListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleToggleStatus = async (icp: ICP) => {
    setLoading(icp.id);
    try {
      const newStatus = icp.status === "active" ? "archived" : "active";
      await updateICP(icp.id, {
        status: newStatus,
        changeReason: `Status alterado para ${statusConfig[newStatus].label}`
      });
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao alterar status");
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (icp: ICP) => {
    const totalLinks = icp._count.leads + icp._count.organizations;

    if (totalLinks > 0) {
      alert(
        `Não é possível excluir "${icp.name}" pois está vinculado a ${icp._count.leads} lead(s) e ${icp._count.organizations} organização(ões).`
      );
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir "${icp.name}"?`)) return;

    setLoading(icp.id);
    try {
      await deleteICP(icp.id);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao excluir ICP");
    } finally {
      setLoading(null);
    }
  };

  if (icps.length === 0) {
    return (
      <div className="col-span-2 rounded-xl border-2 border-dashed border-gray-300 p-12 text-center bg-gray-50/50">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <Target className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">
          Nenhum ICP cadastrado
        </h3>
        <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
          Crie seu primeiro ICP (Ideal Customer Profile) para começar a categorizar leads e organizações.
        </p>
      </div>
    );
  }

  return (
    <div className="col-span-2 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          ICPs Cadastrados
        </h2>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {icps.length} {icps.length === 1 ? 'perfil' : 'perfis'}
        </span>
      </div>

      <div className="space-y-5">
        {icps.map((icp) => (
          <ICPCard
            key={icp.id}
            icp={icp}
            loading={loading}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
