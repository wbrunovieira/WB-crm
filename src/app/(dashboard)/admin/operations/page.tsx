import Link from "next/link";
import { ArrowLeft, Building2, Users, Search } from "lucide-react";
import { backendFetch } from "@/lib/backend/client";
import { formatDate } from "@/lib/utils";
import OperationsTransferButton from "@/components/admin/OperationsTransferButton";
import OperationsSearchForm from "@/components/admin/OperationsSearchForm";

export default async function OperationsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = searchParams.q?.trim() ?? "";
  const results = query.length >= 2
    ? await backendFetch<Array<{ id: string; name: string; type: string; inOperationsAt: string | null }>>(`/operations/search?q=${encodeURIComponent(query)}`).catch(() => [])
    : [];

  return (
    <div className="p-8">
      {/* Back + Header */}
      <div className="mb-8">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Admin
        </Link>

        <h1 className="text-2xl font-bold text-gray-900">Operations Transfer</h1>
        <p className="mt-1 text-sm text-gray-500">
          Transfira clientes para o sistema de operações. Automações de comunicação
          (WhatsApp, GoTo, Gmail) ficam pausadas enquanto a entidade estiver em Operações.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <OperationsSearchForm initialQuery={query} />
      </div>

      {/* Results */}
      {query.length >= 2 && results.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <Search className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">
            Nenhum lead ou organização encontrado para <strong>{query}</strong>
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((entity) => (
            <div
              key={`${entity.type}-${entity.id}`}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              {/* Left: icon + name + type */}
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-lg p-2 ${
                    entity.type === "organization"
                      ? "bg-blue-50"
                      : "bg-purple-50"
                  }`}
                >
                  {entity.type === "organization" ? (
                    <Building2
                      size={18}
                      className="text-blue-600"
                    />
                  ) : (
                    <Users size={18} className="text-purple-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{entity.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-gray-400 capitalize">
                      {entity.type === "organization" ? "Organização" : "Lead"}
                    </span>
                    {entity.inOperationsAt ? (
                      <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 border border-orange-200">
                        In Operations since {formatDate(entity.inOperationsAt)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 border border-green-200">
                        Active in CRM
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: action button */}
              <OperationsTransferButton
                entityType={entity.type}
                entityId={entity.id}
                entityName={entity.name}
                inOperationsAt={entity.inOperationsAt}
              />
            </div>
          ))}
        </div>
      )}

      {query.length < 2 && query.length > 0 && (
        <p className="text-sm text-gray-400">Digite ao menos 2 caracteres para buscar.</p>
      )}

      {query.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-200 p-12 text-center">
          <Search className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-400">
            Busque um lead ou organização para transferir para Operações
          </p>
        </div>
      )}
    </div>
  );
}
