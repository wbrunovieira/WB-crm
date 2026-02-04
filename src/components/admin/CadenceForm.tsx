"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createCadence, generateUniqueCadenceSlug } from "@/actions/cadences";
import { CADENCE_STATUS_LABELS, type CadenceStatus } from "@/lib/validations/cadence";

type ICP = {
  id: string;
  name: string;
};

type CadenceFormProps = {
  icps: ICP[];
};

export function CadenceForm({ icps }: CadenceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("");
  const [durationDays, setDurationDays] = useState(14);
  const [icpId, setIcpId] = useState<string>("");
  const [status, setStatus] = useState<CadenceStatus>("draft");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const slug = await generateUniqueCadenceSlug(name);
      await createCadence({
        name,
        slug,
        description: description || null,
        objective: objective || null,
        durationDays,
        icpId: icpId || null,
        status,
      });

      // Reset form
      setName("");
      setDescription("");
      setObjective("");
      setDurationDays(14);
      setIcpId("");
      setStatus("draft");

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar cadência");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Nova Cadência</h2>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Nome *
          </label>
          <input
            type="text"
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cadência IFEE 14 dias"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label
            htmlFor="objective"
            className="block text-sm font-medium text-gray-700"
          >
            Objetivo
          </label>
          <input
            type="text"
            id="objective"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Agendar reunião de diagnóstico"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="durationDays"
              className="block text-sm font-medium text-gray-700"
            >
              Duração (dias) *
            </label>
            <input
              type="number"
              id="durationDays"
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
              htmlFor="status"
              className="block text-sm font-medium text-gray-700"
            >
              Status *
            </label>
            <select
              id="status"
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
            htmlFor="icpId"
            className="block text-sm font-medium text-gray-700"
          >
            ICP (opcional)
          </label>
          <select
            id="icpId"
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
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Descrição
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição detalhada da cadência..."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Criando...
            </span>
          ) : (
            "Criar Cadência"
          )}
        </button>
      </form>
    </div>
  );
}
