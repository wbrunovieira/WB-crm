"use client";

import { useState } from "react";
import { X, Loader2, Bot, Target, MapPin, Building2, Hash, ChevronRight } from "lucide-react";

type ICP = {
  id: string;
  name: string;
  content: string;
  status: string;
  _count?: {
    leads: number;
    organizations: number;
  };
};

type AgentLeadGenerationModalProps = {
  icps: ICP[];
  onClose: () => void;
};

type FormData = {
  searchTerm: string;
  city: string;
  state: string;
  country: string;
  quantity: number;
  quality: "cold" | "warm" | "hot";
};

export function AgentLeadGenerationModal({
  icps,
  onClose,
}: AgentLeadGenerationModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedICP, setSelectedICP] = useState<ICP | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    searchTerm: "",
    city: "",
    state: "",
    country: "Brasil",
    quantity: 1,
    quality: "warm",
  });

  const handleSelectICP = (icp: ICP) => {
    setSelectedICP(icp);
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedICP) {
      setError("Selecione um ICP");
      return;
    }

    if (!formData.searchTerm.trim()) {
      setError("Termo de busca é obrigatório");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Prepare the payload for the agent
      const payload = {
        icp: {
          id: selectedICP.id,
          name: selectedICP.name,
          content: selectedICP.content,
        },
        searchParams: {
          searchTerm: formData.searchTerm,
          city: formData.city || undefined,
          state: formData.state || undefined,
          country: formData.country || undefined,
          quantity: formData.quantity,
          quality: formData.quality,
        },
      };

      // TODO: Replace with actual agent API call
      // For now, we'll just log and simulate success
      console.log("Agent payload:", JSON.stringify(payload, null, 2));

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSuccess(true);

      // Close modal after showing success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar para o agente");
    } finally {
      setSubmitting(false);
    }
  };

  const qualityOptions = [
    { value: "cold", label: "Frio", description: "Leads iniciais, sem qualificação" },
    { value: "warm", label: "Morno", description: "Leads com algum interesse identificado" },
    { value: "hot", label: "Quente", description: "Leads com alta probabilidade de conversão" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-purple-600 to-purple-800 p-4 text-white">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Bot className="h-6 w-6" />
            Criar Leads por Agente IA
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 border-b bg-gray-50 px-6 py-3">
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
              step === 1
                ? "bg-purple-100 text-purple-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current text-white text-xs">
              {step > 1 ? "✓" : "1"}
            </span>
            <span className={step === 1 ? "text-purple-800" : "text-green-800"}>
              Selecionar ICP
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
              step === 2
                ? "bg-purple-100 text-purple-800"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                step === 2 ? "bg-purple-600 text-white" : "bg-gray-300 text-gray-600"
              }`}
            >
              2
            </span>
            <span>Configurar Busca</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {success ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Solicitação Enviada!
              </h3>
              <p className="mt-2 text-center text-gray-600">
                O agente começará a buscar leads com base no ICP selecionado.
                <br />
                Você será notificado quando os leads estiverem disponíveis.
              </p>
            </div>
          ) : step === 1 ? (
            /* Step 1: Select ICP */
            <div>
              <p className="mb-4 text-gray-600">
                Selecione o ICP (Perfil de Cliente Ideal) que o agente usará como base para buscar leads:
              </p>

              {icps.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                  <Target className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    Nenhum ICP ativo encontrado
                  </h3>
                  <p className="mt-2 text-gray-500">
                    Crie um ICP em Administração antes de usar o agente.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {icps.map((icp) => (
                    <button
                      key={icp.id}
                      onClick={() => handleSelectICP(icp)}
                      className="group w-full rounded-lg border-2 border-gray-200 bg-white p-4 text-left transition-all hover:border-purple-500 hover:bg-purple-600 hover:shadow-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 group-hover:text-white">
                            {icp.name}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-sm text-gray-600 group-hover:text-purple-100">
                            {icp.content.substring(0, 150)}
                            {icp.content.length > 150 ? "..." : ""}
                          </p>
                          {icp._count && (
                            <div className="mt-2 flex gap-4 text-xs text-gray-500 group-hover:text-purple-200">
                              <span>{icp._count.leads} leads vinculados</span>
                              <span>{icp._count.organizations} organizações</span>
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-white" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Step 2: Configure Search */
            <form onSubmit={handleSubmit}>
              {/* Selected ICP Summary */}
              <div className="mb-6 rounded-lg border-2 border-purple-200 bg-purple-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                      ICP Selecionado
                    </span>
                    <h3 className="mt-1 text-lg font-bold text-purple-900">
                      {selectedICP?.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="rounded-md bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700 hover:bg-purple-200 hover:text-purple-900"
                  >
                    Alterar
                  </button>
                </div>
              </div>

              {/* Search Parameters */}
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    <Building2 className="mr-1 inline h-4 w-4" />
                    Termo de Busca *
                  </label>
                  <input
                    type="text"
                    value={formData.searchTerm}
                    onChange={(e) =>
                      setFormData({ ...formData, searchTerm: e.target.value })
                    }
                    placeholder="Ex: agência de marketing, software house, e-commerce"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    O agente usará este termo junto com o ICP para buscar leads relevantes
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      <MapPin className="mr-1 inline h-4 w-4" />
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      placeholder="São Paulo"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Estado
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      placeholder="SP"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      País
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({ ...formData, country: e.target.value })
                      }
                      placeholder="Brasil"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      <Hash className="mr-1 inline h-4 w-4" />
                      Quantidade de Leads
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantity: Math.max(1, parseInt(e.target.value) || 1),
                        })
                      }
                      placeholder="1"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Mínimo: 1 lead
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Qualidade Inicial
                    </label>
                    <select
                      value={formData.quality}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quality: e.target.value as "cold" | "warm" | "hot",
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      {qualityOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label} - {opt.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4" />
                      Iniciar Busca com Agente
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
