"use client";

import { useState, useEffect } from "react";
import {
  getLeadSecondaryCNAEs,
  getOrganizationSecondaryCNAEs,
  addSecondaryCNAEToLead,
  addSecondaryCNAEToOrganization,
  removeSecondaryCNAEFromLead,
  removeSecondaryCNAEFromOrganization,
  searchCNAEs,
} from "@/actions/cnaes";
import { Plus, X, Search } from "lucide-react";

interface CNAE {
  id: string;
  code: string;
  description: string;
}

interface SecondaryCNAEsManagerProps {
  entityId: string;
  entityType: "lead" | "organization";
}

export function SecondaryCNAEsManager({ entityId, entityType }: SecondaryCNAEsManagerProps) {
  const [cnaes, setCnaes] = useState<CNAE[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CNAE[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    loadCNAEs();
  }, [entityId, entityType]);

  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (query.length >= 2) {
        setSearching(true);
        try {
          const results = await searchCNAEs(query);
          // Filter out already added CNAEs
          const filtered = results.filter(
            (r) => !cnaes.some((c) => c.id === r.id)
          );
          setSearchResults(filtered);
        } catch (error) {
          console.error("Error searching:", error);
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [query, cnaes]);

  const loadCNAEs = async () => {
    setLoading(true);
    try {
      const data =
        entityType === "lead"
          ? await getLeadSecondaryCNAEs(entityId)
          : await getOrganizationSecondaryCNAEs(entityId);
      setCnaes(data);
    } catch (error) {
      console.error("Error loading CNAEs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (cnaeId: string) => {
    setAdding(cnaeId);
    try {
      if (entityType === "lead") {
        await addSecondaryCNAEToLead(entityId, cnaeId);
      } else {
        await addSecondaryCNAEToOrganization(entityId, cnaeId);
      }
      await loadCNAEs();
      setQuery("");
      setSearchResults([]);
      setShowAdd(false);
    } catch (error: any) {
      alert(error.message || "Erro ao adicionar CNAE");
    } finally {
      setAdding(null);
    }
  };

  const handleRemove = async (cnaeId: string, description: string) => {
    if (!confirm(`Remover "${description}"?`)) return;

    setRemoving(cnaeId);
    try {
      if (entityType === "lead") {
        await removeSecondaryCNAEFromLead(entityId, cnaeId);
      } else {
        await removeSecondaryCNAEFromOrganization(entityId, cnaeId);
      }
      await loadCNAEs();
    } catch (error: any) {
      alert(error.message || "Erro ao remover CNAE");
    } finally {
      setRemoving(null);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Carregando...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Atividades Secundárias (CNAEs)
        </label>
        {!showAdd && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1 text-sm text-primary hover:text-purple-700"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        )}
      </div>

      {showAdd && (
        <div className="rounded-md border border-gray-300 bg-gray-50 p-3">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite para buscar CNAE..."
              className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>

          {searching && <div className="text-xs text-gray-500">Buscando...</div>}

          {searchResults.length > 0 && (
            <div className="max-h-48 space-y-1 overflow-auto">
              {searchResults.map((cnae) => (
                <div
                  key={cnae.id}
                  className="flex items-start justify-between rounded border border-gray-200 bg-white p-2"
                >
                  <div className="flex-1 text-xs">
                    <div className="font-mono text-gray-600">{cnae.code}</div>
                    <div className="text-gray-900">{cnae.description}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAdd(cnae.id)}
                    disabled={adding === cnae.id}
                    className="ml-2 text-xs text-primary hover:text-purple-700 disabled:opacity-50"
                  >
                    {adding === cnae.id ? "..." : "Adicionar"}
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setShowAdd(false);
              setQuery("");
              setSearchResults([]);
            }}
            className="mt-2 text-xs text-gray-600 hover:text-gray-900"
          >
            Cancelar
          </button>
        </div>
      )}

      {cnaes.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma atividade secundária cadastrada</p>
      ) : (
        <div className="space-y-2">
          {cnaes.map((cnae) => (
            <div
              key={cnae.id}
              className="flex items-start justify-between rounded-md border border-gray-200 bg-white px-3 py-2"
            >
              <div className="flex-1">
                <div className="font-mono text-xs text-gray-600">{cnae.code}</div>
                <div className="text-sm text-gray-900">{cnae.description}</div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(cnae.id, cnae.description)}
                disabled={removing === cnae.id}
                className="ml-2 text-gray-400 hover:text-red-600 disabled:opacity-50"
                title="Remover"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
