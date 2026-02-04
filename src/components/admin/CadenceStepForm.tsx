"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createCadenceStep } from "@/actions/cadence-steps";
import { CADENCE_CHANNEL_LABELS, type CadenceChannel } from "@/lib/validations/cadence";

type CadenceStepFormProps = {
  cadenceId: string;
  maxDay?: number;
};

export function CadenceStepForm({ cadenceId, maxDay = 1 }: CadenceStepFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dayNumber, setDayNumber] = useState(maxDay);
  const [channel, setChannel] = useState<CadenceChannel>("email");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createCadenceStep({
        cadenceId,
        dayNumber,
        channel,
        subject,
        description: description || null,
        order: 0,
      });

      // Reset form, keeping dayNumber for convenience
      setSubject("");
      setDescription("");
      setDayNumber(dayNumber + 2); // Suggest next day

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar etapa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Nova Etapa</h2>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="dayNumber"
              className="block text-sm font-medium text-gray-700"
            >
              Dia *
            </label>
            <input
              type="number"
              id="dayNumber"
              required
              min={1}
              max={90}
              value={dayNumber}
              onChange={(e) => setDayNumber(parseInt(e.target.value) || 1)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="channel"
              className="block text-sm font-medium text-gray-700"
            >
              Canal *
            </label>
            <select
              id="channel"
              required
              value={channel}
              onChange={(e) => setChannel(e.target.value as CadenceChannel)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {Object.entries(CADENCE_CHANNEL_LABELS).map(([value, { label, icon }]) => (
                <option key={value} value={value}>
                  {icon} {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="subject"
            className="block text-sm font-medium text-gray-700"
          >
            Assunto *
          </label>
          <input
            type="text"
            id="subject"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Dor direta, pergunta aberta"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Descrição / Script
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalhes sobre o que fazer nesta etapa..."
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
              Adicionando...
            </span>
          ) : (
            "Adicionar Etapa"
          )}
        </button>
      </form>
    </div>
  );
}
