"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Archive } from "lucide-react";
import { DeleteLeadIconButton } from "@/components/leads/DeleteLeadIconButton";
import { LeadNameCell } from "@/components/leads/LeadNameCell";
import { EntityAccessBadges } from "@/components/shared/EntityAccessBadges";
import { BulkApplyCadenceModal } from "@/components/leads/BulkApplyCadenceModal";
import { BulkArchiveModal } from "@/components/leads/BulkArchiveModal";

type LeadContact = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  isActive: boolean;
};

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
  leadContacts?: LeadContact[];
  _count: { leadContacts: number; leadCadences: number };
};

type SharedUser = { id: string; name: string };

interface LeadsTableProps {
  leads: Lead[];
  sharedUsersMap: Record<string, SharedUser[]>;
  currentUserId: string;
  contactSearch?: string;
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

function normalize(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function LeadsTable({ leads, sharedUsersMap, currentUserId, contactSearch }: LeadsTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showBulkArchiveModal, setShowBulkArchiveModal] = useState(false);
  const lastSelectedIndex = useRef<number | null>(null);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const allSelected = leads.length > 0 && selectedIds.size === leads.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
    lastSelectedIndex.current = null;
  };

  const toggleOne = (id: string, index: number, shiftKey: boolean) => {
    if (shiftKey && lastSelectedIndex.current !== null) {
      const start = Math.min(lastSelectedIndex.current, index);
      const end = Math.max(lastSelectedIndex.current, index);
      const rangeIds = leads.slice(start, end + 1).map((l) => l.id);
      const isAdding = !selectedIds.has(id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        rangeIds.forEach((rid) => {
          if (isAdding) next.add(rid);
          else next.delete(rid);
        });
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    }
    lastSelectedIndex.current = index;
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
            onClick={() => setShowBulkArchiveModal(true)}
            className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
          >
            <Archive className="h-4 w-4" />
            Arquivar
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
                  ref={headerCheckboxRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary"
                  title={allSelected ? "Desselecionar todos" : "Selecionar todos"}
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
            {leads.map((lead, index) => (
              <tr
                key={lead.id}
                onClick={(e) => {
                  const tag = (e.target as HTMLElement).tagName;
                  if (tag === "INPUT" || tag === "A" || tag === "BUTTON" || tag === "SVG" || tag === "PATH") return;
                  toggleOne(lead.id, index, e.shiftKey);
                }}
                className={`cursor-pointer select-none hover:bg-gray-50 ${selectedIds.has(lead.id) ? "bg-purple-50/50" : ""}`}
              >
                <td className="w-12 px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(lead.id)}
                    onChange={(e) => toggleOne(lead.id, index, e.nativeEvent instanceof MouseEvent && (e.nativeEvent as MouseEvent).shiftKey)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary"
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
                <td className="px-6 py-4 text-sm text-gray-500">
                  {contactSearch && lead.leadContacts ? (() => {
                    const term = normalize(contactSearch);
                    const matches = lead.leadContacts.filter(
                      (c) =>
                        c.isActive &&
                        (normalize(c.name).includes(term) ||
                          (c.email && normalize(c.email).includes(term)))
                    );
                    return matches.length > 0 ? (
                      <div className="space-y-1.5">
                        {matches.map((c) => (
                          <div key={c.id} className="rounded-md bg-purple-50 border border-purple-200 px-2 py-1.5">
                            <span className="font-semibold text-purple-900 text-xs">{c.name}</span>
                            {c.role && <span className="ml-1 text-[11px] text-purple-700">· {c.role}</span>}
                            {c.email && <p className="text-[11px] text-purple-600 font-medium">{c.email}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span>{lead._count.leadContacts} contato(s)</span>
                    );
                  })() : (
                    <span>{lead._count.leadContacts} contato(s)</span>
                  )}
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

      {/* Bulk Archive Modal */}
      {showBulkArchiveModal && (
        <BulkArchiveModal
          leadIds={Array.from(selectedIds)}
          onClose={() => setShowBulkArchiveModal(false)}
          onSuccess={() => {
            setShowBulkArchiveModal(false);
            setSelectedIds(new Set());
            router.refresh();
          }}
        />
      )}
    </>
  );
}
