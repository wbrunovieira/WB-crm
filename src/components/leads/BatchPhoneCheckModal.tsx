"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { BACKEND_URL } from "@/lib/api-client";

interface BatchResult {
  total: number;
  checked: number;
  valid: number;
  invalid: number;
  skipped: number;
  errors: number;
}

interface ProgressEvent {
  type: "progress";
  current: number;
  total: number;
  leadId: string;
  businessName: string;
  skipped?: boolean;
  phone?: { valid: boolean; type: string };
  phone2?: { valid: boolean; type: string };
  whatsapp?: { valid: boolean; type: string };
  error?: string;
}

type Status = "idle" | "loading-groups" | "ready" | "running" | "done" | "error";

export function BatchPhoneCheckModal() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [sourceGroups, setSourceGroups] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [xhrRef, setXhrRef] = useState<XMLHttpRequest | null>(null);

  const openModal = async () => {
    setOpen(true);
    setStatus("loading-groups");
    setResult(null);
    setProgress(null);
    setSelected("");
    setErrorMsg("");

    try {
      const res = await fetch(`${BACKEND_URL}/phone/verify/lead/source-groups`, {
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
    xhr.open("POST", `${BACKEND_URL}/phone/verify/lead/batch`);
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

    setXhrRef(xhr);
    xhr.send(JSON.stringify({ sourceGroup: selected }));
  };

  const close = () => {
    xhrRef?.abort();
    setXhrRef(null);
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
        className="inline-flex items-center gap-2 rounded-md border border-blue-400/50 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
      >
        <PhoneIcon className="h-4 w-4" />
        Verificar Telefone em Lote
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl bg-[#1a0a2e] border border-purple-800/50 shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <PhoneIcon className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Verificar Telefone em Lote</h2>
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

        {/* Ready */}
        {status === "ready" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Selecionar grupo de leads
              </label>
              <select
                value={selected}
                onChange={e => setSelected(e.target.value)}
                className="w-full rounded-lg border border-purple-700 bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="">— escolha um grupo —</option>
                {sourceGroups.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-500">
              O sistema verificará o formato dos telefones (phone, phone2, whatsapp) dos leads do grupo via libphonenumber-js. Verificação é instantânea — sem delay.
            </p>
            <button
              onClick={startCheck}
              disabled={!selected}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
              <p className="font-mono text-sm font-semibold text-blue-300">{selected}</p>
            </div>

            {progress && (
              <>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">{progress.current} / {progress.total}</p>
                  <p className="text-sm text-gray-200 truncate mt-1">{progress.businessName}</p>
                  {progress.skipped && (
                    <p className="text-xs text-gray-500 mt-0.5">sem telefone — ignorado</p>
                  )}
                  {progress.phone && (
                    <p className="text-xs mt-0.5" style={{ color: progress.phone.valid ? "#4ade80" : "#f87171" }}>
                      Tel: {progress.phone.valid ? `válido (${progress.phone.type})` : "inválido"}
                    </p>
                  )}
                  {progress.error && (
                    <p className="text-xs text-red-400 mt-0.5">Erro: {progress.error}</p>
                  )}
                </div>
              </>
            )}

            {!progress && (
              <div className="flex items-center justify-center gap-2 py-4 text-gray-400">
                <SpinnerIcon className="h-4 w-4 animate-spin" />
                <span className="text-sm">Iniciando...</span>
              </div>
            )}
          </div>
        )}

        {/* Done */}
        {status === "done" && result && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-2xl text-green-400 mb-2">✓</div>
              <p className="text-white font-semibold">Verificação concluída!</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-[#2d1b3d] p-3 text-center">
                <p className="text-gray-400 text-xs">Total</p>
                <p className="text-white font-bold text-lg">{result.total}</p>
              </div>
              <div className="rounded-lg bg-[#2d1b3d] p-3 text-center">
                <p className="text-gray-400 text-xs">Verificados</p>
                <p className="text-blue-300 font-bold text-lg">{result.checked}</p>
              </div>
              <div className="rounded-lg bg-[#2d1b3d] p-3 text-center">
                <p className="text-gray-400 text-xs">Válidos</p>
                <p className="text-green-400 font-bold text-lg">{result.valid}</p>
              </div>
              <div className="rounded-lg bg-[#2d1b3d] p-3 text-center">
                <p className="text-gray-400 text-xs">Inválidos</p>
                <p className="text-red-400 font-bold text-lg">{result.invalid}</p>
              </div>
              {result.skipped > 0 && (
                <div className="rounded-lg bg-[#2d1b3d] p-3 text-center">
                  <p className="text-gray-400 text-xs">Ignorados</p>
                  <p className="text-gray-300 font-bold text-lg">{result.skipped}</p>
                </div>
              )}
              {result.errors > 0 && (
                <div className="rounded-lg bg-[#2d1b3d] p-3 text-center">
                  <p className="text-gray-400 text-xs">Erros</p>
                  <p className="text-yellow-400 font-bold text-lg">{result.errors}</p>
                </div>
              )}
            </div>
            <button
              onClick={close}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-red-400 font-medium">{errorMsg}</p>
            </div>
            <button
              onClick={close}
              className="w-full rounded-lg border border-gray-600 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={className}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
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
