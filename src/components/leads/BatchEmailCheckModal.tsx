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
  valid: boolean | null;
  status?: string;
  reason?: string;
  error?: string;
}

type Status = "idle" | "loading-groups" | "ready" | "running" | "done" | "error";

export function BatchEmailCheckModal() {
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
      const res = await fetch(`${BACKEND_URL}/email/verify/source-groups`, {
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
    xhr.open("POST", `${BACKEND_URL}/email/verify/batch`);
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
        className="inline-flex items-center gap-2 rounded-md border border-purple-400/50 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors"
      >
        <AtSignIcon className="h-4 w-4" />
        Verificar Email em Lote
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl bg-[#1a0a2e] border border-purple-800/50 shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <AtSignIcon className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Verificar Email em Lote</h2>
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
                className="w-full rounded-lg border border-purple-700 bg-[#2d1b3d] px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="">— escolha um grupo —</option>
                {sourceGroups.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-500">
              O sistema verificará o email de todos os leads do grupo selecionado via DNS (MX lookup). Leads sem email serão ignorados.
            </p>
            <button
              onClick={startCheck}
              disabled={!selected}
              className="w-full rounded-lg bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Iniciar Verificacao
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
                    className="bg-purple-500 h-2 rounded-full transition-all duration-300"
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
                  {progress.valid === true && (
                    <p className="text-green-400 text-xs mt-1">&#10003; Email valido</p>
                  )}
                  {progress.valid === false && progress.status === "risky" && (
                    <p className="text-yellow-400 text-xs mt-1">&#9888; Arriscado: {progress.reason}</p>
                  )}
                  {progress.valid === false && progress.status !== "risky" && (
                    <p className="text-red-400 text-xs mt-1">&#10007; {progress.reason}</p>
                  )}
                  {progress.valid === null && !progress.error && (
                    <p className="text-gray-500 text-xs mt-1">— Sem email (ignorado)</p>
                  )}
                  {progress.error && (
                    <p className="text-yellow-400 text-xs mt-1">&#9888; {progress.error}</p>
                  )}
                </div>
              </>
            )}

            <p className="text-xs text-gray-500 text-center">
              Nao feche esta janela durante a verificacao.
            </p>
          </div>
        )}

        {/* Done */}
        {status === "done" && result && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/20 mb-3">
                <CheckIcon className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-white font-semibold">Verificacao concluida!</h3>
              <p className="text-xs text-gray-500 mt-1 font-mono">{selected}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total no grupo" value={result.total} color="text-gray-300" />
              <StatCard label="Verificados" value={result.checked} color="text-blue-400" />
              <StatCard label="Emails validos" value={result.valid} color="text-green-400" />
              <StatCard label="Emails invalidos" value={result.invalid} color="text-red-400" />
              <StatCard label="Sem email" value={result.skipped} color="text-yellow-400" />
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

function AtSignIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
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
