"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X, Pencil } from "lucide-react";
import { updateCadence, generateUniqueCadenceSlug } from "@/actions/cadences";
import { CADENCE_STATUS_LABELS, type CadenceStatus } from "@/lib/validations/cadence";

type ICP = {
  id: string;
  name: string;
};

type Cadence = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  objective: string | null;
  durationDays: number;
  icpId: string | null;
  status: string;
};

type CadenceEditModalProps = {
  cadence: Cadence;
  icps: ICP[];
  onClose: () => void;
  onSuccess: () => void;
};

export function CadenceEditModal({ cadence, icps, onClose, onSuccess }: CadenceEditModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(cadence.name);
  const [description, setDescription] = useState(cadence.description || "");
  const [objective, setObjective] = useState(cadence.objective || "");
  const [durationDays, setDurationDays] = useState(cadence.durationDays);
  const [icpId, setIcpId] = useState<string>(cadence.icpId || "");
  const [status, setStatus] = useState<CadenceStatus>(cadence.status as CadenceStatus);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Generate new slug if name changed
      let slug = cadence.slug;
      if (name !== cadence.name) {
        slug = await generateUniqueCadenceSlug(name);
      }

      await updateCadence(cadence.id, {
        name,
        slug,
        description: description || null,
        objective: objective || null,
        durationDays,
        icpId: icpId || null,
        status,
      });

      router.refresh();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar cadência");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Pencil className="h-5 w-5 text-primary" />
            Editar Cadência
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="edit-name"
                className="block text-sm font-medium text-gray-700"
              >
                Nome *
              </label>
              <input
                type="text"
                id="edit-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Cadência IFEE 14 dias"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label
                htmlFor="edit-objective"
                className="block text-sm font-medium text-gray-700"
              >
                Objetivo
              </label>
              <input
                type="text"
                id="edit-objective"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Agendar reunião de diagnóstico"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="edit-durationDays"
                  className="block text-sm font-medium text-gray-700"
                >
                  Duração (dias) *
                </label>
                <input
                  type="number"
                  id="edit-durationDays"
                  required
                  min={1}
                  max={90}
                  value={durationDays}
                  onChange={(e) => setDurationDays(parseInt(e.target.value) || 14)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-status"
                  className="block text-sm font-medium text-gray-700"
                >
                  Status *
                </label>
                <select
                  id="edit-status"
                  required
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CadenceStatus)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {Object.entries(CADENCE_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="edit-icpId"
                className="block text-sm font-medium text-gray-700"
              >
                ICP (opcional)
              </label>
              <select
                id="edit-icpId"
                value={icpId}
                onChange={(e) => setIcpId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Cadência Genérica (todos ICPs)</option>
                {icps.map((icp) => (
                  <option key={icp.id} value={icp.id}>
                    {icp.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Se não selecionar, a cadência estará disponível para todos os leads
              </p>
            </div>

            <div>
              <label
                htmlFor="edit-description"
                className="block text-sm font-medium text-gray-700"
              >
                Descrição
              </label>
              <textarea
                id="edit-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição detalhada da cadência..."
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </span>
                ) : (
                  "Salvar Alterações"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
