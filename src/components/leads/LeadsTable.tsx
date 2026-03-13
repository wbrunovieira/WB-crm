"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Archive } from "lucide-react";
import { DeleteLeadIconButton } from "@/components/leads/DeleteLeadIconButton";
import { LeadNameCell } from "@/components/leads/LeadNameCell";
import { EntityAccessBadges } from "@/components/shared/EntityAccessBadges";
import { BulkApplyCadenceModal } from "@/components/leads/BulkApplyCadenceModal";

type Lead = {
  id: string;
  businessName: string;
  registeredName: string | null;
  city: string | null;
  state: string | null;
  status: string;
  quality: string | null;
  isArchived: boolean;
  owner: { id: string; name: string } | null;
  icps: { icp: { id: string; name: string } }[];
  _count: { leadContacts: number; leadCadences: number };
};

type SharedUser = { id: string; name: string };

interface LeadsTableProps {
  leads: Lead[];
  sharedUsersMap: Record<string, SharedUser[]>;
  currentUserId: string;
}

const statusLabels: Record<string, string> = {
  new: "Novo",
  contacted: "Contatado",
  qualified: "Qualificado",
  disqualified: "Desqualificado",
};

const qualityLabels: Record<string, string> = {
  cold: "Frio",
  warm: "Morno",
  hot: "Quente",
};

export function LeadsTable({ leads, sharedUsersMap, currentUserId }: LeadsTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);

  const allSelected = leads.length > 0 && selectedIds.size === leads.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <>
      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-4 rounded-lg bg-purple-50 border border-purple-200 px-4 py-3">
          <span className="text-sm font-medium text-purple-800">
            {selectedIds.size} {selectedIds.size === 1 ? "lead selecionado" : "leads selecionados"}
          </span>
          <button
            onClick={() => setShowBulkModal(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Zap className="h-4 w-4" />
            Aplicar Cadência
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Limpar seleção
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Empresa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                ICP
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Localização
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Contatos
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Qualidade
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Cadência
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className={`hover:bg-gray-50 ${selectedIds.has(lead.id) ? "bg-purple-50/50" : ""}`}
              >
                <td className="w-12 px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(lead.id)}
                    onChange={() => toggleOne(lead.id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <LeadNameCell
                      id={lead.id}
                      businessName={lead.businessName}
                      registeredName={lead.registeredName}
                    />
                    {lead.isArchived && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 text-xs font-semibold leading-5 text-amber-800">
                        <Archive className="h-3 w-3" />
                        Arquivado
                      </span>
                    )}
                    {lead.owner && (
                      <EntityAccessBadges
                        owner={{ id: lead.owner.id, name: lead.owner.name }}
                        sharedWith={sharedUsersMap[lead.id] || []}
                        currentUserId={currentUserId}
                        compact
                      />
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {lead.icps[0]?.icp ? (
                    <span className="inline-flex rounded-full bg-purple-100 px-2 text-xs font-semibold leading-5 text-purple-800">
                      {lead.icps[0].icp.name}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {lead.city && lead.state
                    ? `${lead.city}, ${lead.state}`
                    : lead.city || lead.state || "-"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {lead._count.leadContacts} contato(s)
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {lead.quality && (
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        lead.quality === "hot"
                          ? "bg-red-100 text-red-800"
                          : lead.quality === "warm"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {qualityLabels[lead.quality]}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      lead.status === "qualified"
                        ? "bg-green-100 text-green-800"
                        : lead.status === "contacted"
                          ? "bg-blue-100 text-blue-800"
                          : lead.status === "disqualified"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {statusLabels[lead.status]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {lead._count.leadCadences > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
                      <Zap className="h-3 w-3" />
                      {lead._count.leadCadences}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="text-gray-600 hover:text-primary"
                      title="Ver detalhes"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path
                          fillRule="evenodd"
                          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </Link>
                    <Link
                      href={`/leads/${lead.id}/edit`}
                      className="text-gray-600 hover:text-primary"
                      title="Editar"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </Link>
                    <DeleteLeadIconButton leadId={lead.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk Apply Cadence Modal */}
      {showBulkModal && (
        <BulkApplyCadenceModal
          leadIds={Array.from(selectedIds)}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setShowBulkModal(false);
            setSelectedIds(new Set());
            router.refresh();
          }}
        />
      )}
    </>
  );
}
