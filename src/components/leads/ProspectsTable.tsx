"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ExternalLink,
  MapPin,
  Globe,
  Star,
  CheckCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { PhoneLink } from "@/components/ui/phone-link";
import { useDeleteLead } from "@/hooks/leads/use-leads";
import { toast } from "sonner";
import { useConfirmDialog, ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ProspectDetailModal } from "./ProspectDetailModal";

type Prospect = {
  id: string;
  businessName: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  companyRegistrationID?: string | null;
  website?: string | null;
  rating?: number | null;
  userRatingsTotal?: number | null;
  categories?: string | null;
  businessStatus?: string | null;
  description?: string | null;
  googleMapsUrl?: string | null;
  source?: string | null;
  searchTerm?: string | null;
  createdAt: Date | string;
  owner?: { id: string; name: string } | null;
};

interface LeadSummary {
  leadId: string;
  businessName: string;
  companyRegistrationID: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  isArchived: boolean;
  status: string;
}

interface LeadDuplicates {
  cnpj: LeadSummary[];
  name: LeadSummary[];
  phone: LeadSummary[];
  email: LeadSummary[];
  address: LeadSummary[];
}

const DUPLICATE_LABELS: Record<keyof LeadDuplicates, string> = {
  cnpj:    "Mesmo CNPJ",
  name:    "Nome similar",
  phone:   "Mesmo telefone / WhatsApp",
  email:   "Mesmo e-mail",
  address: "Mesmo logradouro e cidade",
};

interface ProspectsTableProps {
  prospects: Prospect[];
  currentUserId: string;
}

const BUSINESS_STATUS_LABELS: Record<string, string> = {
  OPERATIONAL: "Operacional",
  CLOSED_TEMPORARILY: "Fechado temporariamente",
  CLOSED_PERMANENTLY: "Fechado permanentemente",
};

export function ProspectsTable({ prospects, currentUserId }: ProspectsTableProps) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<LeadDuplicates | null>(null);
  const [pendingQualifyId, setPendingQualifyId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const { confirm, dialogProps } = useConfirmDialog();
  const deleteMutation = useDeleteLead();

  async function doQualify(id: string) {
    setLoadingId(id);
    setDuplicates(null);
    setPendingQualifyId(null);
    try {
      await apiFetch(`/leads/${id}/qualify`, token, { method: "PATCH" });
      toast.success("Lead qualificado com sucesso");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao qualificar");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleQualify(prospect: Prospect) {
    const confirmed = await confirm({
      title: "Qualificar como Lead",
      message: `Mover "${prospect.businessName}" para leads? O prospecto será convertido em lead para prospecção.`,
      confirmLabel: "Qualificar",
      variant: "default",
    });
    if (!confirmed) return;

    try {
      const rawDup = await apiFetch<{
        hasDuplicates: boolean;
        duplicates: Array<{ leadId: string; businessName: string; matchedFields: string[]; score: number }>;
      }>("/leads/check-duplicates", token, {
        method: "POST",
        body: JSON.stringify({
          name: prospect.businessName,
          cnpj: prospect.companyRegistrationID,
          phone: prospect.phone,
          email: prospect.email,
        }),
      });

      const dupResult: LeadDuplicates = { cnpj: [], name: [], phone: [], email: [], address: [] };
      for (const match of rawDup.duplicates ?? []) {
        const item: LeadSummary = {
          leadId: match.leadId,
          businessName: match.businessName,
          companyRegistrationID: null,
          phone: null,
          email: null,
          city: null,
          state: null,
          isArchived: false,
          status: "",
        };
        for (const field of match.matchedFields) {
          if (field in dupResult) dupResult[field as keyof LeadDuplicates].push(item);
        }
      }

      const hasDups = Object.values(dupResult).some((arr) => arr.length > 0);
      if (hasDups) {
        setDuplicates(dupResult);
        setPendingQualifyId(prospect.id);
        return;
      }
    } catch {
      // if check fails, proceed anyway
    }

    await doQualify(prospect.id);
  }

  async function handleDelete(id: string, name: string) {
    const confirmed = await confirm({
      title: "Remover Prospecto",
      message: `Remover "${name}" dos prospectos? Esta ação não pode ser desfeita.`,
      confirmLabel: "Remover",
      variant: "danger",
    });
    if (!confirmed) return;

    setLoadingId(id);
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Prospecto removido");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover");
    } finally {
      setLoadingId(null);
    }
  }

  if (prospects.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <h3 className="text-lg font-medium text-gray-900">Nenhum prospecto encontrado</h3>
        <p className="mt-2 text-gray-500">
          Use o botão &ldquo;Buscar no Google&rdquo; na página de Leads para importar prospectos.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Empresa
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Localização
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Contato
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Google
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {prospects.map((p) => (
              <tr
                key={p.id}
                className="hover:bg-purple-50/40 transition-colors cursor-pointer"
                onClick={() => setDetailId(p.id)}
              >
                {/* Empresa */}
                <td className="px-4 py-3">
                  <div>
                    <p className="font-semibold text-gray-900">{p.businessName}</p>
                    {p.categories && (
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{p.categories}</p>
                    )}
                    {p.description && (
                      <p className="mt-0.5 text-xs text-gray-400 line-clamp-2 max-w-xs">
                        {p.description}
                      </p>
                    )}
                    {p.searchTerm && (
                      <span className="mt-1 inline-block rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-600">
                        {p.searchTerm}
                      </span>
                    )}
                  </div>
                </td>

                {/* Localização */}
                <td className="px-4 py-3">
                  {(p.city || p.state) ? (
                    <div className="flex items-start gap-1.5 text-sm text-gray-600">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span>
                        {[p.city, p.state, p.country].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>

                {/* Contato */}
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    {p.phone ? (
                      <PhoneLink phone={p.phone} className="text-sm text-gray-600 hover:text-primary" />
                    ) : (
                      <span className="text-xs text-gray-400">Sem telefone</span>
                    )}
                    {p.website && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Globe className="h-3.5 w-3.5 text-gray-400" />
                        <a
                          href={p.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate max-w-[140px] text-blue-600 hover:underline"
                        >
                          {p.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      </div>
                    )}
                  </div>
                </td>

                {/* Google */}
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    {p.rating != null ? (
                      <div className="flex items-center gap-1 text-sm text-amber-600">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-medium">{p.rating.toFixed(1)}</span>
                        {p.userRatingsTotal != null && (
                          <span className="text-xs text-gray-400">({p.userRatingsTotal})</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Sem avaliação</span>
                    )}
                    {p.googleMapsUrl && (
                      <a
                        href={p.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Ver no Maps
                      </a>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  {p.businessStatus ? (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.businessStatus === "OPERATIONAL"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {BUSINESS_STATUS_LABELS[p.businessStatus] ?? p.businessStatus}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>

                {/* Ações */}
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleQualify(p)}
                      disabled={loadingId === p.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                      title="Qualificar como Lead"
                    >
                      {loadingId === p.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle className="h-3.5 w-3.5" />
                      )}
                      Lead qualificado
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.businessName)}
                      disabled={loadingId === p.id}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      title="Remover prospecto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog {...dialogProps} />

      {detailId && (
        <ProspectDetailModal
          prospectId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}

      {duplicates && pendingQualifyId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-xl bg-[#1a0a2e] border border-yellow-500/40 p-5 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="text-yellow-400 text-xl leading-none mt-0.5">⚠</span>
              <div>
                <p className="font-semibold text-yellow-300">Possíveis leads duplicados encontrados</p>
                <p className="text-sm text-yellow-200/70 mt-0.5">
                  Revise os leads abaixo antes de qualificar. Você pode abrir cada um para conferir ou
                  qualificar mesmo assim.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {(Object.keys(duplicates) as (keyof LeadDuplicates)[])
                .filter((k) => duplicates[k].length > 0)
                .map((category) => (
                  <div key={category}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-yellow-400/80 mb-1.5">
                      {DUPLICATE_LABELS[category]}
                    </p>
                    <ul className="space-y-1">
                      {duplicates[category].map((lead) => (
                        <li key={lead.leadId} className="flex items-center gap-2 text-sm">
                          <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${lead.isArchived ? "bg-gray-400" : "bg-green-400"}`} />
                          <Link
                            href={`/leads/${lead.leadId}`}
                            target="_blank"
                            className="text-yellow-200 hover:underline font-medium"
                          >
                            {lead.businessName}
                          </Link>
                          {lead.companyRegistrationID && (
                            <span className="text-yellow-200/50 font-mono text-xs">{lead.companyRegistrationID}</span>
                          )}
                          {lead.city && (
                            <span className="text-yellow-200/50 text-xs">{lead.city}{lead.state ? ` / ${lead.state}` : ""}</span>
                          )}
                          {lead.isArchived && (
                            <span className="text-xs text-gray-400 italic">(arquivado)</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => doQualify(pendingQualifyId)}
                disabled={!!loadingId}
                className="rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-black hover:bg-yellow-400 disabled:opacity-50"
              >
                {loadingId ? "Qualificando..." : "Qualificar mesmo assim"}
              </button>
              <button
                onClick={() => { setDuplicates(null); setPendingQualifyId(null); }}
                className="rounded-md border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-[#2d1b3d]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
