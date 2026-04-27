"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { BACKEND_URL } from "@/lib/api-client";

interface BatchResult {
  total: number;
  checked: number;
  found: number;
  notFound: number;
  skipped: number;
  errors: number;
}

interface ProgressEvent {
  type: "progress";
  current: number;
  total: number;
  leadId: string;
  businessName: string;
  exists: boolean | null;
  error?: string;
}

type Status = "idle" | "loading-groups" | "ready" | "running" | "done" | "error";

export function BatchWhatsAppCheckModal() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [sourceGroups, setSourceGroups] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const abortRef = useRef<(() => void) | null>(null);

  const openModal = async () => {
    setOpen(true);
    setStatus("loading-groups");
    setResult(null);
    setProgress(null);
    setSelected("");
    setErrorMsg("");

    try {
      const res = await fetch(`${BACKEND_URL}/whatsapp/source-groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSourceGroups(data.sourceGroups ?? []);
      setStatus(data.sourceGroups?.length > 0 ? "ready" : "error");
      if (!data.sourceGroups?.length) setErrorMsg("Nenhum grupo encontrado. Importe leads com o campo Lote preenchido.");
    } catch {
      setStatus("error");
      setErrorMsg("Erro ao carregar grupos.");
    }
  };

  const startCheck = () => {
    if (!selected) return;
    setStatus("running");
    setProgress(null);
    setResult(null);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BACKEND_URL}/whatsapp/batch-check`);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    let buffer = "";

    xhr.onprogress = () => {
      const newChunk = xhr.responseText.slice(buffer.length);
      buffer = xhr.responseText;

      const lines = newChunk.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === "progress") setProgress(event);
          else if (event.type === "done") {
            setResult(event);
            setStatus("done");
          } else if (event.type === "error") {
            setErrorMsg(event.message);
            setStatus("error");
          }
        } catch {}
      }
    };

    xhr.onload = () => {
      if (status !== "done") setStatus("done");
    };

    xhr.onerror = () => {
      setErrorMsg("Erro de conexão com o servidor.");
      setStatus("error");
    };

    abortRef.current = () => xhr.abort();
    xhr.send(JSON.stringify({ sourceGroup: selected }));
  };

  const close = () => {
    abortRef.current?.();
    setOpen(false);
    setStatus("idle");
    setProgress(null);
    setResult(null);
    setErrorMsg("");
    setSelected("");
  };

  if (!open) {
    return (
      <button
        onClick={openModal}
        className="inline-flex items-center gap-2 rounded-md border border-[#25D366]/50 bg-[#25D366]/10 px-4 py-2 text-sm font-medium text-[#128C7E] hover:bg-[#25D366]/20 transition-colors"
      >
        <WhatsAppIcon className="h-4 w-4" />
        Verificar WhatsApp em Lote
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl bg-[#1a0a2e] border border-purple-800/50 shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <WhatsAppIcon className="h-5 w-5 text-[#25D366]" />
            <h2 className="text-lg font-semibold text-white">Verificar WhatsApp em Lote</h2>
          </div>
          <button onClick={close} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        {/* Loading groups */}
        {status === "loading-groups" && (
          <div className="flex items-center gap-3 text-gray-400 py-8 justify-center">
            <SpinnerIcon className="h-5 w-5 animate-spin" />
            <span>Carregando grupos...</span>
          </div>
        )}

        {/* Ready — select group */}
        {status === "ready" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Selecionar grupo de leads
              </label>
              <select
                value={selected}
                onChange={e => setSelected(e.target.value)}
                className="w-full rounded-lg border border-purple-700 bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#25D366]/50"
              >
                <option value="">— escolha um grupo —</option>
                {sourceGroups.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-500">
              O sistema verificará todos os leads do grupo selecionado, um de cada vez, com intervalo de 1.5s entre cada check para evitar bloqueio pela API.
            </p>
            <button
              onClick={startCheck}
              disabled={!selected}
              className="w-full rounded-lg bg-[#25D366] py-2.5 text-sm font-semibold text-white hover:bg-[#1da951] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Iniciar Verificação
            </button>
          </div>
        )}

        {/* Running */}
        {status === "running" && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-1">Verificando grupo</p>
              <p className="font-mono text-sm font-semibold text-indigo-300">{selected}</p>
            </div>

            {progress && (
              <>
                {/* Progress bar */}
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-[#25D366] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <p className="text-center text-sm text-gray-400">
                  {progress.current} / {progress.total}
                </p>
                {/* Last checked */}
                <div className="rounded-lg border border-purple-800/40 bg-purple-900/20 p-3 text-sm">
                  <p className="text-gray-400 text-xs mb-1">Verificando agora:</p>
                  <p className="text-gray-200 font-medium truncate">{progress.businessName}</p>
                  {progress.exists === true && (
                    <p className="text-[#25D366] text-xs mt-1">✓ Tem WhatsApp</p>
                  )}
                  {progress.exists === false && (
                    <p className="text-red-400 text-xs mt-1">✗ Sem WhatsApp</p>
                  )}
                  {progress.error && (
                    <p className="text-yellow-400 text-xs mt-1">⚠ {progress.error}</p>
                  )}
                </div>
              </>
            )}

            <p className="text-xs text-gray-500 text-center">
              Não feche esta janela durante a verificação.
            </p>
          </div>
        )}

        {/* Done */}
        {status === "done" && result && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#25D366]/20 mb-3">
                <CheckIcon className="h-6 w-6 text-[#25D366]" />
              </div>
              <h3 className="text-white font-semibold">Verificação concluída!</h3>
              <p className="text-xs text-gray-500 mt-1 font-mono">{selected}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total no grupo" value={result.total} color="text-gray-300" />
              <StatCard label="Verificados" value={result.checked} color="text-blue-400" />
              <StatCard label="Têm WhatsApp" value={result.found} color="text-[#25D366]" />
              <StatCard label="Sem WhatsApp" value={result.notFound} color="text-red-400" />
              <StatCard label="Sem telefone" value={result.skipped} color="text-yellow-400" />
              <StatCard label="Erros" value={result.errors} color="text-orange-400" />
            </div>

            <button
              onClick={close}
              className="w-full rounded-lg border border-purple-700 py-2 text-sm text-gray-300 hover:bg-purple-900/30 transition-colors"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-4 text-sm text-red-300">
              {errorMsg || "Ocorreu um erro."}
            </div>
            <button
              onClick={close}
              className="w-full rounded-lg border border-purple-700 py-2 text-sm text-gray-300 hover:bg-purple-900/30"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-purple-800/40 bg-purple-900/20 p-3 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} strokeOpacity={0.25} />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}
