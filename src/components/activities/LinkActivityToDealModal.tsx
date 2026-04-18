"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Search, Link2, Loader2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { useLinkActivityToDeal, useUnlinkActivityFromDeal } from "@/hooks/activities/use-activities";
import { BACKEND_URL } from "@/lib/api-client";
import { useSession } from "next-auth/react";

type Deal = {
  id: string;
  title: string;
};

type Props = {
  activityId: string;
  activitySubject: string;
  currentDealId: string;
  additionalDealIds: string[];
  onClose: () => void;
  onChanged: () => void;
};

export default function LinkActivityToDealModal({
  activityId,
  activitySubject,
  currentDealId,
  additionalDealIds,
  onClose,
  onChanged,
}: Props) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const linkToDeal = useLinkActivityToDeal();
  const unlinkFromDeal = useUnlinkActivityFromDeal();
  const [query, setQuery] = useState("");
  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/deals`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    })
      .then((r) => r.json())
      .then((deals: Array<{ id: string; title: string }>) => setAllDeals(deals.map((d) => ({ id: d.id, title: d.title }))))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [token]);

  const dealMap = useMemo(
    () => new Map(allDeals.map((d) => [d.id, d.title])),
    [allDeals]
  );

  const allLinkedIds = new Set([currentDealId, ...additionalDealIds]);

  const searchResults = useMemo(() => {
    const q = query.toLowerCase();
    return allDeals.filter(
      (d) => !allLinkedIds.has(d.id) && (!q || d.title.toLowerCase().includes(q))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDeals, query, currentDealId, additionalDealIds.join(",")]);

  function handleLink(dealId: string) {
    setLoadingId(dealId);
    linkToDeal.mutate(
      { activityId, dealId },
      {
        onSuccess: () => { toast.success("Atividade vinculada ao negócio"); onChanged(); onClose(); },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao vincular"),
        onSettled: () => setLoadingId(null),
      },
    );
  }

  function handleUnlink(dealId: string) {
    setLoadingId(dealId);
    unlinkFromDeal.mutate(
      { activityId, dealId },
      {
        onSuccess: () => { toast.success("Vínculo removido"); onChanged(); onClose(); },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao desvincular"),
        onSettled: () => setLoadingId(null),
      },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Vincular a outro Negócio</h2>
            <p className="mt-0.5 truncate text-sm text-gray-500">{activitySubject}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Currently linked (additional) deals */}
          {additionalDealIds.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                Também vinculado a
              </p>
              <div className="space-y-1.5">
                {additionalDealIds.map((dealId) => (
                  <div
                    key={dealId}
                    className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Link2 className="h-3.5 w-3.5 shrink-0 text-purple-500" />
                      <span className="truncate text-sm font-medium text-purple-900">
                        {dealMap.get(dealId) ?? dealId}
                      </span>
                    </div>
                    <button
                      onClick={() => handleUnlink(dealId)}
                      disabled={loadingId === dealId}
                      className="ml-2 shrink-0 rounded p-1 text-purple-400 hover:bg-purple-100 hover:text-red-600 disabled:opacity-50"
                      title="Remover vínculo"
                    >
                      {loadingId === dealId ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Unlink className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Buscar negócio
            </p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nome do negócio..."
                autoFocus
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-gray-200">
              {fetching ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400">
                  {query ? "Nenhum negócio encontrado" : "Nenhum outro negócio disponível"}
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {searchResults.map((deal) => (
                    <li key={deal.id}>
                      <button
                        onClick={() => handleLink(deal.id)}
                        disabled={loadingId === deal.id}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
                      >
                        {loadingId === deal.id ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                        ) : (
                          <Link2 className="h-4 w-4 shrink-0 text-gray-400" />
                        )}
                        <span className="font-medium text-gray-900">{deal.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
