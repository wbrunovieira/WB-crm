"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Target, Plus, X, Loader2 } from "lucide-react";
import { getLeadICPs, linkLeadToICP, unlinkLeadFromICP } from "@/actions/icp-links";
import { getICPs } from "@/actions/icps";

interface LeadICP {
  id: string;
  leadId: string;
  icpId: string;
  matchScore: number | null;
  notes: string | null;
  createdAt: Date;
  icp: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
}

interface ICP {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface LeadICPSectionProps {
  leadId: string;
  isConverted?: boolean;
}

export function LeadICPSection({ leadId, isConverted = false }: LeadICPSectionProps) {
  const router = useRouter();
  const [linkedICPs, setLinkedICPs] = useState<LeadICP[]>([]);
  const [availableICPs, setAvailableICPs] = useState<ICP[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedICP, setSelectedICP] = useState("");
  const [matchScore, setMatchScore] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [links, icps] = await Promise.all([
        getLeadICPs(leadId),
        getICPs({ status: "active" }),
      ]);
      setLinkedICPs(links);
      setAvailableICPs(icps);
    } catch (err) {
      console.error("Error loading ICPs:", err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedICP) return;

    setLinking(true);
    setError(null);

    try {
      await linkLeadToICP({
        leadId,
        icpId: selectedICP,
        matchScore: matchScore ? parseInt(matchScore) : undefined,
        notes: notes || undefined,
      });
      setShowForm(false);
      setSelectedICP("");
      setMatchScore("");
      setNotes("");
      await loadData();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao vincular ICP");
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (icpId: string) => {
    if (!confirm("Remover vínculo com este ICP?")) return;

    setUnlinking(icpId);
    try {
      await unlinkLeadFromICP(leadId, icpId);
      await loadData();
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao remover vínculo");
    } finally {
      setUnlinking(null);
    }
  };

  const unlinkedICPs = availableICPs.filter(
    (icp) => !linkedICPs.some((link) => link.icpId === icp.id)
  );

  if (loading) {
    return (
      <div className="mt-6 rounded-xl bg-white p-6 shadow-md">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-gray-600">Carregando ICPs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-gray-100">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Target className="h-6 w-6 text-primary" />
          Perfis de Cliente Ideal (ICPs)
        </h2>
        {!isConverted && unlinkedICPs.length > 0 && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Vincular ICP
          </button>
        )}
      </div>

      {/* Link Form */}
      {showForm && (
        <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <form onSubmit={handleLink} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Selecione o ICP *
              </label>
              <select
                value={selectedICP}
                onChange={(e) => setSelectedICP(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Selecione...</option>
                {unlinkedICPs.map((icp) => (
                  <option key={icp.id} value={icp.id}>
                    {icp.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Match Score (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={matchScore}
                  onChange={(e) => setMatchScore(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ex: 85"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Observações
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ex: Excelente fit"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={linking}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {linking ? "Vinculando..." : "Vincular"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Linked ICPs */}
      {linkedICPs.length === 0 ? (
        <p className="text-sm text-gray-500">
          Nenhum ICP vinculado a este lead.
          {unlinkedICPs.length > 0 && !isConverted && (
            <button
              onClick={() => setShowForm(true)}
              className="ml-1 text-primary hover:underline"
            >
              Vincular agora
            </button>
          )}
        </p>
      ) : (
        <div className="space-y-3">
          {linkedICPs.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
            >
              <div className="flex-1">
                <Link
                  href={`/admin/icps/${link.icp.id}`}
                  className="font-medium text-gray-900 hover:text-primary"
                >
                  {link.icp.name}
                </Link>
                <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                  <span>/{link.icp.slug}</span>
                  {link.matchScore !== null && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {link.matchScore}% match
                    </span>
                  )}
                  {link.notes && (
                    <span className="italic">&quot;{link.notes}&quot;</span>
                  )}
                </div>
              </div>
              {!isConverted && (
                <button
                  onClick={() => handleUnlink(link.icp.id)}
                  disabled={unlinking === link.icp.id}
                  className="ml-2 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-50"
                  title="Remover vínculo"
                >
                  {unlinking === link.icp.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
