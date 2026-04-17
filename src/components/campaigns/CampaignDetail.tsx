"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  addCampaignStep,
  addRecipients,
} from "@/actions/campaigns";
import type {
  CampaignDetail as TCampaignDetail,
  CampaignStatus,
  StepType,
  SendStatus,
} from "@/actions/campaigns";

/* ── Status helpers ── */

const STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: "Rascunho", ACTIVE: "Ativa", PAUSED: "Pausada", FINISHED: "Finalizada",
};
const STATUS_COLOR: Record<CampaignStatus, string> = {
  DRAFT: "bg-gray-700 text-gray-300",
  ACTIVE: "bg-green-900/50 text-green-400 border border-green-700",
  PAUSED: "bg-yellow-900/50 text-yellow-400 border border-yellow-700",
  FINISHED: "bg-purple-900/50 text-purple-300 border border-purple-700",
};

const SEND_STATUS_LABEL: Record<SendStatus, string> = {
  PENDING: "Pendente", RUNNING: "Enviando", DONE: "Enviado",
  FAILED: "Falhou", OPTED_OUT: "Optou fora",
};
const SEND_STATUS_COLOR: Record<SendStatus, string> = {
  PENDING: "text-gray-400", RUNNING: "text-blue-400", DONE: "text-green-400",
  FAILED: "text-red-400", OPTED_OUT: "text-yellow-400",
};

const STEP_TYPE_LABEL: Record<StepType, string> = {
  TEXT: "Texto", MEDIA: "Mídia", AUDIO: "Áudio", DELAY: "Aguardar", TYPING: "Digitando",
};
const STEP_TYPE_COLOR: Record<StepType, string> = {
  TEXT: "border-blue-700 text-blue-400", MEDIA: "border-purple-700 text-purple-400",
  AUDIO: "border-pink-700 text-pink-400", DELAY: "border-gray-600 text-gray-400",
  TYPING: "border-teal-700 text-teal-400",
};

/* ── Props ── */

interface Props {
  campaign: TCampaignDetail;
}

/* ── Component ── */

export function CampaignDetail({ campaign: initial }: Props) {
  const router = useRouter();
  const [campaign] = useState(initial);
  const [tab, setTab] = useState<"steps" | "recipients" | "stats">("steps");
  const [loading, setLoading] = useState<string | null>(null);

  /* ── Step form ── */
  const [stepType, setStepType] = useState<StepType>("TEXT");
  const [stepText, setStepText] = useState("");
  const [stepMedia, setStepMedia] = useState({ url: "", caption: "", type: "image" });
  const [stepDelay, setStepDelay] = useState(5);
  const [stepTyping, setStepTyping] = useState(3);

  /* ── Recipients ── */
  const [phonesRaw, setPhonesRaw] = useState("");

  /* ── Campaign actions ── */

  const handleAction = async (action: "start" | "pause" | "resume") => {
    setLoading(action);
    const fn = action === "start" ? startCampaign : action === "pause" ? pauseCampaign : resumeCampaign;
    const result = await fn(campaign.id);
    setLoading(null);
    if (result.success) {
      toast.success(action === "start" ? "Campanha iniciada!" : action === "pause" ? "Campanha pausada" : "Campanha retomada!");
      router.refresh();
    } else {
      toast.error(result.error ?? "Erro");
    }
  };

  /* ── Add step ── */

  const handleAddStep = async () => {
    setLoading("addStep");
    const data =
      stepType === "TEXT" ? { type: stepType, text: stepText }
      : stepType === "MEDIA" ? { type: stepType, mediaUrl: stepMedia.url, mediaCaption: stepMedia.caption, mediaType: stepMedia.type }
      : stepType === "AUDIO" ? { type: stepType, mediaUrl: stepMedia.url }
      : stepType === "DELAY" ? { type: stepType, delaySeconds: stepDelay }
      : { type: stepType, typingSeconds: stepTyping };

    const result = await addCampaignStep(campaign.id, data as any);
    setLoading(null);
    if (result.success) {
      toast.success("Step adicionado!");
      setStepText("");
      setStepMedia({ url: "", caption: "", type: "image" });
      router.refresh();
    } else {
      toast.error(result.error ?? "Erro");
    }
  };

  /* ── Add recipients ── */

  const handleAddRecipients = async () => {
    const phones = phonesRaw.split(/[\n,;]+/).map((p) => p.trim()).filter(Boolean);
    if (phones.length === 0) { toast.error("Digite ao menos um número"); return; }
    setLoading("addRecipients");
    const result = await addRecipients(campaign.id, phones);
    setLoading(null);
    if (result.success) {
      toast.success(`${result.added} destinatário(s) adicionado(s)${result.invalid && result.invalid.length > 0 ? ` · ${result.invalid.length} inválido(s)` : ""}`);
      if (result.invalid && result.invalid.length > 0) {
        toast.warning(`Inválidos: ${result.invalid.join(", ")}`);
      }
      setPhonesRaw("");
      router.refresh();
    } else {
      toast.error(result.error ?? "Erro");
    }
  };

  /* ── Stats ── */

  const statusCounts = campaign.sends.reduce(
    (acc, s) => { acc[s.status] = (acc[s.status] ?? 0) + 1; return acc; },
    {} as Partial<Record<SendStatus, number>>,
  );

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-xl border border-[#792990]/30 bg-[#1a0022]/70 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-100">{campaign.name}</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[campaign.status]}`}>
                {STATUS_LABEL[campaign.status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">Instância: {campaign.instanceName}</p>
            {campaign.description && (
              <p className="mt-2 text-sm text-gray-400">{campaign.description}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {(campaign.status === "DRAFT" || campaign.status === "PAUSED") && (
              <button
                onClick={() => handleAction("start")}
                disabled={!!loading}
                className="rounded-lg bg-green-900/40 border border-green-700/50 px-4 py-2 text-sm font-medium text-green-400 hover:bg-green-900/70 transition-colors disabled:opacity-50"
              >
                {loading === "start" ? "..." : "Iniciar"}
              </button>
            )}
            {campaign.status === "ACTIVE" && (
              <button
                onClick={() => handleAction("pause")}
                disabled={!!loading}
                className="rounded-lg bg-yellow-900/40 border border-yellow-700/50 px-4 py-2 text-sm font-medium text-yellow-400 hover:bg-yellow-900/70 transition-colors disabled:opacity-50"
              >
                {loading === "pause" ? "..." : "Pausar"}
              </button>
            )}
            {campaign.status === "PAUSED" && (
              <button
                onClick={() => handleAction("resume")}
                disabled={!!loading}
                className="rounded-lg bg-blue-900/40 border border-blue-700/50 px-4 py-2 text-sm font-medium text-blue-400 hover:bg-blue-900/70 transition-colors disabled:opacity-50"
              >
                {loading === "resume" ? "..." : "Retomar"}
              </button>
            )}
          </div>
        </div>

        {/* Quick stats row */}
        <div className="mt-4 flex flex-wrap gap-6 border-t border-[#792990]/20 pt-4 text-sm">
          <div>
            <span className="text-gray-500">Steps: </span>
            <span className="font-medium text-gray-200">{campaign.stepsCount}</span>
          </div>
          <div>
            <span className="text-gray-500">Destinatários: </span>
            <span className="font-medium text-gray-200">{campaign.sends.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Enviados: </span>
            <span className="font-medium text-green-400">{statusCounts.DONE ?? 0}</span>
          </div>
          <div>
            <span className="text-gray-500">Falhas: </span>
            <span className="font-medium text-red-400">{statusCounts.FAILED ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-[#792990]/20 bg-[#1a0022]/40 p-1 w-fit">
        {(["steps", "recipients", "stats"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? "bg-primary text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {t === "steps" ? "Steps" : t === "recipients" ? "Destinatários" : "Estatísticas"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "steps" && (
        <div className="space-y-4">
          {/* Existing steps */}
          {campaign.sends.length === 0 && campaign.stepsCount === 0 && (
            <p className="text-sm text-gray-500">Nenhum step configurado ainda.</p>
          )}

          {/* Add step form */}
          {campaign.status !== "ACTIVE" && campaign.status !== "FINISHED" && (
            <div className="rounded-xl border border-[#792990]/30 bg-[#1a0022]/70 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-300">Adicionar step</h3>

              {/* Step type */}
              <div className="flex flex-wrap gap-2">
                {(["TEXT", "MEDIA", "AUDIO", "DELAY", "TYPING"] as StepType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setStepType(t)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      stepType === t ? "bg-primary/30 border-primary text-white" : `${STEP_TYPE_COLOR[t]} hover:bg-[#350045]`
                    }`}
                  >
                    {STEP_TYPE_LABEL[t]}
                  </button>
                ))}
              </div>

              {/* Step fields */}
              {stepType === "TEXT" && (
                <textarea
                  value={stepText}
                  onChange={(e) => setStepText(e.target.value)}
                  rows={3}
                  placeholder="Digite a mensagem..."
                  className="w-full rounded-lg border border-[#792990]/40 bg-[#1a0022] px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-[#792990] focus:outline-none resize-none"
                />
              )}

              {(stepType === "MEDIA" || stepType === "AUDIO") && (
                <div className="space-y-2">
                  <input
                    value={stepMedia.url}
                    onChange={(e) => setStepMedia({ ...stepMedia, url: e.target.value })}
                    placeholder="URL do arquivo (https://...)"
                    className="w-full rounded-lg border border-[#792990]/40 bg-[#1a0022] px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-[#792990] focus:outline-none"
                  />
                  {stepType === "MEDIA" && (
                    <>
                      <input
                        value={stepMedia.caption}
                        onChange={(e) => setStepMedia({ ...stepMedia, caption: e.target.value })}
                        placeholder="Legenda (opcional)"
                        className="w-full rounded-lg border border-[#792990]/40 bg-[#1a0022] px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-[#792990] focus:outline-none"
                      />
                      <select
                        value={stepMedia.type}
                        onChange={(e) => setStepMedia({ ...stepMedia, type: e.target.value })}
                        className="rounded-lg border border-[#792990]/40 bg-[#1a0022] px-3 py-2 text-sm text-gray-200 focus:border-[#792990] focus:outline-none"
                      >
                        <option value="image">Imagem</option>
                        <option value="video">Vídeo</option>
                        <option value="document">Documento</option>
                      </select>
                    </>
                  )}
                </div>
              )}

              {stepType === "DELAY" && (
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-400">Aguardar</label>
                  <input
                    type="number"
                    value={stepDelay}
                    onChange={(e) => setStepDelay(Number(e.target.value))}
                    min={1}
                    max={3600}
                    className="w-24 rounded-lg border border-[#792990]/40 bg-[#1a0022] px-3 py-2 text-sm text-gray-200 focus:border-[#792990] focus:outline-none"
                  />
                  <label className="text-sm text-gray-400">segundos</label>
                </div>
              )}

              {stepType === "TYPING" && (
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-400">Mostrar digitando por</label>
                  <input
                    type="number"
                    value={stepTyping}
                    onChange={(e) => setStepTyping(Number(e.target.value))}
                    min={1}
                    max={60}
                    className="w-20 rounded-lg border border-[#792990]/40 bg-[#1a0022] px-3 py-2 text-sm text-gray-200 focus:border-[#792990] focus:outline-none"
                  />
                  <label className="text-sm text-gray-400">segundos</label>
                </div>
              )}

              <button
                type="button"
                onClick={handleAddStep}
                disabled={loading === "addStep"}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {loading === "addStep" ? "Adicionando..." : "Adicionar Step"}
              </button>
            </div>
          )}

          {campaign.status === "ACTIVE" && (
            <p className="text-xs text-yellow-400">Pause a campanha para editar os steps.</p>
          )}
        </div>
      )}

      {tab === "recipients" && (
        <div className="space-y-4">
          {/* Add recipients */}
          {campaign.status !== "FINISHED" && (
            <div className="rounded-xl border border-[#792990]/30 bg-[#1a0022]/70 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-300">Adicionar destinatários</h3>
              <p className="text-xs text-gray-500">
                Um número por linha, ou separados por vírgula. Formato: 11999999999 ou 5511999999999
              </p>
              <textarea
                value={phonesRaw}
                onChange={(e) => setPhonesRaw(e.target.value)}
                rows={5}
                placeholder="11999999999&#10;5511888888888&#10;21977777777"
                className="w-full rounded-lg border border-[#792990]/40 bg-[#1a0022] px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-[#792990] focus:outline-none resize-none font-mono"
              />
              <button
                type="button"
                onClick={handleAddRecipients}
                disabled={loading === "addRecipients"}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {loading === "addRecipients" ? "Adicionando..." : "Adicionar"}
              </button>
            </div>
          )}

          {/* Recipients list */}
          {campaign.sends.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum destinatário adicionado ainda.</p>
          ) : (
            <div className="rounded-xl border border-[#792990]/30 bg-[#1a0022]/70 overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-2.5 text-xs font-medium text-gray-500 border-b border-[#792990]/20">
                <span>#</span>
                <span>Telefone</span>
                <span>Step</span>
                <span>Status</span>
              </div>
              <div className="max-h-96 overflow-y-auto divide-y divide-[#792990]/10">
                {campaign.sends.map((send, i) => (
                  <div key={send.id} className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-2.5 text-sm items-center">
                    <span className="text-gray-600">{i + 1}</span>
                    <span className="font-mono text-gray-300">{send.phone}</span>
                    <span className="text-gray-500">{send.currentStep}</span>
                    <span className={`font-medium ${SEND_STATUS_COLOR[send.status]}`}>
                      {SEND_STATUS_LABEL[send.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "stats" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {(["PENDING", "RUNNING", "DONE", "FAILED", "OPTED_OUT"] as SendStatus[]).map((status) => (
            <div key={status} className="rounded-xl border border-[#792990]/30 bg-[#1a0022]/70 p-4 text-center">
              <div className={`text-3xl font-bold ${SEND_STATUS_COLOR[status]}`}>
                {statusCounts[status] ?? 0}
              </div>
              <div className="mt-1 text-xs text-gray-500">{SEND_STATUS_LABEL[status]}</div>
            </div>
          ))}
          <div className="rounded-xl border border-[#792990]/30 bg-[#1a0022]/70 p-4 text-center col-span-2 sm:col-span-3 lg:col-span-5">
            <div className="text-3xl font-bold text-gray-200">{campaign.sends.length}</div>
            <div className="mt-1 text-xs text-gray-500">Total de destinatários</div>
          </div>
        </div>
      )}
    </div>
  );
}
