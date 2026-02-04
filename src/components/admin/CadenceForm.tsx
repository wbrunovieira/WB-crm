"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { createCadence, generateUniqueCadenceSlug } from "@/actions/cadences";
import { cadenceSchema, CADENCE_STATUS_LABELS, type CadenceStatus } from "@/lib/validations/cadence";
import { ZodError } from "zod";

type ICP = {
  id: string;
  name: string;
};

type CadenceFormProps = {
  icps: ICP[];
};

type FieldErrors = {
  name?: string;
  description?: string;
  objective?: string;
  durationDays?: string;
};

// Character limits
const LIMITS = {
  name: 100,
  description: 10000,
  objective: 2000,
};

export function CadenceForm({ icps }: CadenceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("");
  const [durationDays, setDurationDays] = useState(14);
  const [icpId, setIcpId] = useState<string>("");
  const [status, setStatus] = useState<CadenceStatus>("draft");

  // Validate a single field
  const validateField = (field: keyof FieldErrors, value: string | number) => {
    const errors: FieldErrors = { ...fieldErrors };

    switch (field) {
      case "name":
        if (typeof value === "string") {
          if (value.length < 2) {
            errors.name = "Nome deve ter pelo menos 2 caracteres";
          } else if (value.length > LIMITS.name) {
            errors.name = `Nome deve ter no máximo ${LIMITS.name} caracteres`;
          } else {
            delete errors.name;
          }
        }
        break;
      case "description":
        if (typeof value === "string" && value.length > LIMITS.description) {
          errors.description = `Descrição deve ter no máximo ${LIMITS.description.toLocaleString()} caracteres`;
        } else {
          delete errors.description;
        }
        break;
      case "objective":
        if (typeof value === "string" && value.length > LIMITS.objective) {
          errors.objective = `Objetivo deve ter no máximo ${LIMITS.objective.toLocaleString()} caracteres`;
        } else {
          delete errors.objective;
        }
        break;
      case "durationDays":
        if (typeof value === "number") {
          if (value < 1) {
            errors.durationDays = "Duração deve ser pelo menos 1 dia";
          } else if (value > 90) {
            errors.durationDays = "Duração deve ser no máximo 90 dias";
          } else {
            delete errors.durationDays;
          }
        }
        break;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate all fields before submit
  const validateForm = (): boolean => {
    const errors: FieldErrors = {};

    if (name.length < 2) {
      errors.name = "Nome deve ter pelo menos 2 caracteres";
    } else if (name.length > LIMITS.name) {
      errors.name = `Nome deve ter no máximo ${LIMITS.name} caracteres`;
    }

    if (description.length > LIMITS.description) {
      errors.description = `Descrição deve ter no máximo ${LIMITS.description.toLocaleString()} caracteres`;
    }

    if (objective.length > LIMITS.objective) {
      errors.objective = `Objetivo deve ter no máximo ${LIMITS.objective.toLocaleString()} caracteres`;
    }

    if (durationDays < 1 || durationDays > 90) {
      errors.durationDays = "Duração deve ser entre 1 e 90 dias";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Parse backend error
  const parseBackendError = (err: unknown): string => {
    if (err instanceof ZodError) {
      const messages = err.errors.map((e) => e.message);
      return messages.join(". ");
    }

    if (err instanceof Error) {
      const message = err.message;

      // Try to parse Zod errors from message
      if (message.includes("too_big") || message.includes("máximo")) {
        return "Um ou mais campos excedem o limite de caracteres. Verifique os campos destacados.";
      }
      if (message.includes("too_small") || message.includes("mínimo")) {
        return "Um ou mais campos não atendem ao mínimo de caracteres.";
      }
      if (message.includes("Slug já existe")) {
        return "Já existe uma cadência com nome similar. Tente um nome diferente.";
      }
      if (message.includes("Não autorizado")) {
        return "Você não tem permissão para criar cadências. Faça login novamente.";
      }

      return message;
    }

    return "Erro desconhecido ao criar cadência. Tente novamente.";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Frontend validation
    if (!validateForm()) {
      setError("Corrija os erros nos campos antes de enviar.");
      return;
    }

    setLoading(true);

    try {
      // Validate with Zod schema on frontend
      const slug = await generateUniqueCadenceSlug(name);

      const data = {
        name,
        slug,
        description: description || null,
        objective: objective || null,
        durationDays,
        icpId: icpId || null,
        status,
      };

      // Frontend schema validation
      cadenceSchema.parse(data);

      // Send to backend
      await createCadence(data);

      // Success
      setSuccess(true);
      setName("");
      setDescription("");
      setObjective("");
      setDurationDays(14);
      setIcpId("");
      setStatus("draft");
      setFieldErrors({});

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);

      router.refresh();
    } catch (err) {
      setError(parseBackendError(err));
    } finally {
      setLoading(false);
    }
  };

  const getCharCountColor = (current: number, max: number) => {
    const ratio = current / max;
    if (ratio > 1) return "text-red-600 font-semibold";
    if (ratio > 0.9) return "text-amber-600";
    if (ratio > 0.75) return "text-amber-500";
    return "text-gray-400";
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Nova Cadência</h2>

      {/* Error message */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Erro ao criar cadência</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800">Cadência criada com sucesso!</p>
            <p className="text-sm text-green-700 mt-1">Agora adicione as etapas da cadência.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nome *
            </label>
            <span className={`text-xs ${getCharCountColor(name.length, LIMITS.name)}`}>
              {name.length}/{LIMITS.name}
            </span>
          </div>
          <input
            type="text"
            id="name"
            required
            maxLength={LIMITS.name + 10}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              validateField("name", e.target.value);
            }}
            placeholder="Cadência IFEE 14 dias"
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
              fieldErrors.name
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-primary focus:ring-primary"
            }`}
          />
          {fieldErrors.name && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
          )}
        </div>

        {/* Objective */}
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="objective" className="block text-sm font-medium text-gray-700">
              Objetivo
            </label>
            <span className={`text-xs ${getCharCountColor(objective.length, LIMITS.objective)}`}>
              {objective.length}/{LIMITS.objective.toLocaleString()}
            </span>
          </div>
          <input
            type="text"
            id="objective"
            maxLength={LIMITS.objective + 10}
            value={objective}
            onChange={(e) => {
              setObjective(e.target.value);
              validateField("objective", e.target.value);
            }}
            placeholder="Agendar reunião de diagnóstico"
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
              fieldErrors.objective
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-primary focus:ring-primary"
            }`}
          />
          {fieldErrors.objective && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.objective}</p>
          )}
        </div>

        {/* Duration + Status row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="durationDays" className="block text-sm font-medium text-gray-700">
              Duração (dias) *
            </label>
            <input
              type="number"
              id="durationDays"
              required
              min={1}
              max={90}
              value={durationDays}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 14;
                setDurationDays(val);
                validateField("durationDays", val);
              }}
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
                fieldErrors.durationDays
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-primary focus:ring-primary"
              }`}
            />
            {fieldErrors.durationDays && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.durationDays}</p>
            )}
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
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

        {/* ICP */}
        <div>
          <label htmlFor="icpId" className="block text-sm font-medium text-gray-700">
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

        {/* Description */}
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Descrição
            </label>
            <span className={`text-xs ${getCharCountColor(description.length, LIMITS.description)}`}>
              {description.length.toLocaleString()}/{LIMITS.description.toLocaleString()}
            </span>
          </div>
          <textarea
            id="description"
            rows={4}
            maxLength={LIMITS.description + 100}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              validateField("description", e.target.value);
            }}
            placeholder="Descrição detalhada da cadência..."
            className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
              fieldErrors.description
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-primary focus:ring-primary"
            }`}
          />
          {fieldErrors.description && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || Object.keys(fieldErrors).length > 0}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-white font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
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
