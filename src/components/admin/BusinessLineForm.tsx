"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { createBusinessLine, generateUniqueBusinessLineSlug } from "@/actions/business-lines";

// Character limits
const LIMITS = {
  name: 100,
  description: 5000,
  icon: 50,
};

interface BusinessLineFormProps {
  usedOrders: number[];
}

export function BusinessLineForm({ usedOrders }: BusinessLineFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#792990");
  const [icon, setIcon] = useState("");
  const [order, setOrder] = useState(0);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Gera lista de ordens disponíveis (0 a 99, excluindo as já usadas)
  const availableOrders = useMemo(() => {
    const orders: number[] = [];
    for (let i = 0; i <= 99; i++) {
      if (!usedOrders.includes(i)) {
        orders.push(i);
      }
    }
    return orders;
  }, [usedOrders]);

  const handleNameChange = (value: string) => {
    setName(value);
    validateField("name", value);
  };

  const validateField = (field: string, value: string | number) => {
    const errors = { ...fieldErrors };

    switch (field) {
      case "name":
        if (typeof value === "string") {
          if (value.length < 1) {
            errors.name = "Nome é obrigatório";
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
      case "icon":
        if (typeof value === "string" && value.length > LIMITS.icon) {
          errors.icon = `Ícone deve ter no máximo ${LIMITS.icon} caracteres`;
        } else {
          delete errors.icon;
        }
        break;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (name.length < 1) {
      errors.name = "Nome é obrigatório";
    } else if (name.length > LIMITS.name) {
      errors.name = `Nome deve ter no máximo ${LIMITS.name} caracteres`;
    }

    if (description.length > LIMITS.description) {
      errors.description = `Descrição deve ter no máximo ${LIMITS.description.toLocaleString()} caracteres`;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const parseBackendError = (err: unknown): string => {
    if (err instanceof Error) {
      const message = err.message;
      if (message.includes("too_big") || message.includes("máximo")) {
        return "Um ou mais campos excedem o limite de caracteres.";
      }
      if (message.includes("slug")) {
        return "Já existe uma linha de negócio com este slug. Tente outro.";
      }
      return message;
    }
    return "Erro desconhecido. Tente novamente.";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!validateForm()) {
      setError("Corrija os erros nos campos antes de enviar.");
      return;
    }

    setLoading(true);

    try {
      // Generate unique slug from name
      const slug = await generateUniqueBusinessLineSlug(name);

      await createBusinessLine({
        name,
        slug,
        description: description || null,
        color: color || null,
        icon: icon || null,
        isActive: true,
        order,
      });

      setSuccess(true);
      setName("");
      setDescription("");
      setColor("#792990");
      setIcon("");
      setOrder(availableOrders[0] ?? 0);
      setFieldErrors({});

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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Erro</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800">Linha de negócio criada!</p>
          </div>
        </div>
      )}

      {/* Name */}
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Nome <span className="text-red-500">*</span>
          </label>
          <span className={`text-xs ${getCharCountColor(name.length, LIMITS.name)}`}>
            {name.length}/{LIMITS.name}
          </span>
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          maxLength={LIMITS.name + 10}
          className={`mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 ${
            fieldErrors.name
              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-primary focus:ring-primary"
          }`}
          placeholder="Ex: Desenvolvimento Web"
        />
        {fieldErrors.name && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Descrição
          </label>
          <span className={`text-xs ${getCharCountColor(description.length, LIMITS.description)}`}>
            {description.length.toLocaleString()}/{LIMITS.description.toLocaleString()}
          </span>
        </div>
        <textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            validateField("description", e.target.value);
          }}
          rows={4}
          maxLength={LIMITS.description + 100}
          className={`mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 ${
            fieldErrors.description
              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-primary focus:ring-primary"
          }`}
          placeholder="Breve descrição da linha de negócio..."
        />
        {fieldErrors.description && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p>
        )}
      </div>

      {/* Color and Icon row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Cor (Hex)
          </label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-gray-300"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Ícone (Lucide)
            </label>
            <span className={`text-xs ${getCharCountColor(icon.length, LIMITS.icon)}`}>
              {icon.length}/{LIMITS.icon}
            </span>
          </div>
          <input
            type="text"
            value={icon}
            onChange={(e) => {
              setIcon(e.target.value);
              validateField("icon", e.target.value);
            }}
            maxLength={LIMITS.icon + 10}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Ex: Code, Zap, Brain"
          />
        </div>
      </div>

      {/* Order */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Ordem de Exibição
        </label>
        <select
          value={order}
          onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {availableOrders.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {usedOrders.length > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            Ordens já usadas: {usedOrders.sort((a, b) => a - b).join(", ")}
          </p>
        )}
      </div>

      {/* Submit */}
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
          "Criar Linha de Negócio"
        )}
      </button>
    </form>
  );
}
