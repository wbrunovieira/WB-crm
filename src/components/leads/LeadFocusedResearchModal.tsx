"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Target, X, BrainCircuit } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface LeadSnapshot {
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  phone2?: string | null;
  whatsapp?: string | null;
  companyRegistrationID?: string | null;
  description?: string | null;
  companyOwner?: string | null;
  contacts?: unknown[];
  metaAds?: string | null;
}

interface Props {
  leadId: string;
  lead: LeadSnapshot;
  onClose: () => void;
  onStarted: () => void;
}

const FOCUS_FIELDS: Array<{
  value: string;
  label: string;
  hint: string;
  snapshotKey?: keyof LeadSnapshot;
}> = [
  { value: "instagram",             label: "Instagram",       hint: "Buscar perfil Instagram",           snapshotKey: "instagram" },
  { value: "facebook",              label: "Facebook",        hint: "Buscar página Facebook",            snapshotKey: "facebook" },
  { value: "linkedin",              label: "LinkedIn",        hint: "Buscar perfil LinkedIn",            snapshotKey: "linkedin" },
  { value: "website",               label: "Website",         hint: "Buscar site oficial",               snapshotKey: "website" },
  { value: "email",                 label: "Email",           hint: "Buscar ou validar email",           snapshotKey: "email" },
  { value: "phone",                 label: "Telefone",        hint: "Buscar telefone comercial",         snapshotKey: "phone" },
  { value: "whatsapp",              label: "WhatsApp",        hint: "Buscar número WhatsApp",            snapshotKey: "whatsapp" },
  { value: "companyRegistrationID", label: "CNPJ",            hint: "Buscar CNPJ por nome + cidade",     snapshotKey: "companyRegistrationID" },
  { value: "description",           label: "Descrição",       hint: "Escrever descrição da empresa",     snapshotKey: "description" },
  { value: "companyOwner",          label: "Proprietário",    hint: "Identificar dono/sócios",           snapshotKey: "companyOwner" },
  { value: "contacts",              label: "Contatos",        hint: "Encontrar sócios e diretores",      snapshotKey: "contacts" },
  { value: "metaAds",               label: "Meta Ads",        hint: "Verificar anúncios ativos no Meta", snapshotKey: "metaAds" },
  { value: "custom",                label: "Personalizado",   hint: "Instrução livre" },
];

export function LeadFocusedResearchModal({ leadId, lead, onClose, onStarted }: Props) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const router = useRouter();

  const [selectedField, setSelectedField] = useState<string>("");
  const [customInstruction, setCustomInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = !!selectedField && (selectedField !== "custom" || customInstruction.trim().length > 0);

  function isFilled(key?: keyof LeadSnapshot): boolean {
    if (!key) return false;
    const v = lead[key];
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  }

  async function handleStart() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      await apiFetch(`/leads/${leadId}/focused-research`, token, {
        method: "POST",
        body: JSON.stringify({
          field: selectedField,
          customInstruction: customInstruction.trim() || undefined,
        }),
      });
      router.refresh();
      onStarted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar pesquisa focada");
      setLoading(false);
    }
  }

  const selectedMeta = FOCUS_FIELDS.find((f) => f.value === selectedField);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Pesquisa IA Focada</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Field selector */}
          <div>
            <p className="mb-3 text-sm font-medium text-gray-700">Escolha o campo que o agente deve focar:</p>
            <div className="flex flex-wrap gap-2">
              {FOCUS_FIELDS.map((f) => {
                const filled = isFilled(f.snapshotKey);
                const isSelected = selectedField === f.value;
                return (
                  <button
                    key={f.value}
                    onClick={() => setSelectedField(f.value)}
                    title={f.hint}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border ${
                      isSelected
                        ? "bg-purple-600 border-purple-600 text-white"
                        : "bg-white border-gray-200 text-gray-700 hover:border-purple-400 hover:text-purple-700"
                    }`}
                  >
                    {f.label}
                    {f.snapshotKey && (
                      <span className={`h-1.5 w-1.5 rounded-full ${filled ? "bg-green-400" : "bg-gray-300"} ${isSelected ? "opacity-80" : ""}`} />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" /> campo já preenchido
              </span>
              {" · "}
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-300 inline-block" /> campo vazio
              </span>
            </p>
          </div>

          {/* Selected field hint */}
          {selectedMeta && selectedField !== "custom" && (
            <div className="rounded-lg bg-purple-50 border border-purple-200 px-4 py-3">
              <p className="text-sm text-purple-800">
                <span className="font-semibold">{selectedMeta.label}:</span> {selectedMeta.hint}
                {isFilled(selectedMeta.snapshotKey) && (
                  <span className="ml-2 text-purple-600 text-xs">(já tem valor — o agente irá sobrescrever se encontrar algo melhor)</span>
                )}
              </p>
            </div>
          )}

          {/* Custom instruction */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {selectedField === "custom" ? "Instrução para o agente *" : "Instrução adicional (opcional)"}
            </label>
            <textarea
              rows={3}
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder={
                selectedField === "companyRegistrationID"
                  ? "Ex: empresa pode estar registrada também como 'Maria Silva ME'"
                  : selectedField === "email"
                  ? "Ex: procurar email de contato comercial, não o pessoal"
                  : selectedField === "custom"
                  ? "Descreva o que o agente deve buscar ou analisar..."
                  : "Adicione contexto ou restrições específicas para este campo..."
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleStart}
            disabled={loading || !canSubmit}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BrainCircuit className="h-4 w-4" />
            {loading ? "Enviando..." : selectedField ? `Pesquisar ${selectedMeta?.label ?? selectedField}` : "Selecione um campo"}
          </button>
        </div>
      </div>
    </div>
  );
}
