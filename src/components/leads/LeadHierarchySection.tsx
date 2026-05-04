"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { Building2, ChevronRight, X, Link2 } from "lucide-react";
import Link from "next/link";

type LeadRef = { id: string; businessName: string };

type Props = {
  leadId: string;
  parentLead: LeadRef | null | undefined;
  childLeads: LeadRef[] | undefined;
};

export function LeadHierarchySection({ leadId, parentLead, childLeads = [] }: Props) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const router = useRouter();
  const [unlinkingParent, setUnlinkingParent] = useState(false);

  async function unlinkParent() {
    setUnlinkingParent(true);
    try {
      await apiFetch(`/leads/${leadId}`, token, {
        method: "PATCH",
        body: JSON.stringify({ parentLeadId: null }),
      });
      toast.success("Empresa matriz desvinculada");
      router.refresh();
    } catch {
      toast.error("Erro ao desvincular matriz");
    } finally {
      setUnlinkingParent(false);
    }
  }

  const hasAnything = !!parentLead || childLeads.length > 0;
  if (!hasAnything) return null;

  return (
    <div className="mb-5 rounded-xl border border-blue-700/40 bg-blue-900/20 shadow-sm">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-blue-700/30">
        <Link2 size={14} className="text-blue-400" />
        <span className="text-sm font-semibold text-blue-300">Grupo Empresarial</span>
      </div>

      <div className="px-4 py-3 space-y-3">
        {parentLead && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-400 mb-1">Empresa Matriz</p>
            <div className="flex items-center gap-2">
              <Link
                href={`/leads/${parentLead.id}`}
                className="flex items-center gap-1.5 text-sm font-medium text-blue-300 hover:text-blue-200 hover:underline transition-colors"
              >
                <Building2 size={14} />
                {parentLead.businessName}
                <ChevronRight size={12} className="opacity-60" />
              </Link>
              <button
                onClick={unlinkParent}
                disabled={unlinkingParent}
                className="ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-blue-400 hover:bg-blue-800/40 hover:text-red-400 disabled:opacity-50 transition-colors"
                title="Desvincular matriz"
              >
                <X size={11} />
              </button>
            </div>
          </div>
        )}

        {childLeads.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-400 mb-1">
              Unidades do Grupo ({childLeads.length})
            </p>
            <ul className="space-y-1">
              {childLeads.map((child) => (
                <li key={child.id}>
                  <Link
                    href={`/leads/${child.id}`}
                    className="flex items-center gap-1.5 text-sm text-blue-300 hover:text-blue-200 hover:underline transition-colors"
                  >
                    <Building2 size={13} />
                    {child.businessName}
                    <ChevronRight size={11} className="opacity-60" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
