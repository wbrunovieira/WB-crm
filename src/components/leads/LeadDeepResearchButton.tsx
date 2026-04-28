"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

interface Props {
  leadId: string;
  hasResearch: boolean;
  agentResearchAt?: string | null;
}

type Status = "idle" | "loading" | "accepted" | "error";

export function LeadDeepResearchButton({ leadId, hasResearch, agentResearchAt }: Props) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const router = useRouter();

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);
  // Capture the agentResearchAt at the moment the user triggers research
  const baselineRef = useRef<string | null | undefined>(undefined);

  // Detect when agentResearchAt changes during polling (research completed)
  useEffect(() => {
    if (status !== "accepted") return;
    if (baselineRef.current === undefined) return;

    const changed = agentResearchAt !== baselineRef.current;
    if (changed) {
      clearInterval(pollRef.current!);
      pollRef.current = null;
      setStatus("idle");
      toast.success("Pesquisa do agente IA concluída!", {
        description: "Os campos do lead foram atualizados com as informações encontradas.",
        duration: Infinity,
        action: { label: "OK", onClick: () => {} },
      });
    }
  }, [agentResearchAt, status]);

  // Poll router.refresh() every 8s for up to ~2min after request accepted
  useEffect(() => {
    if (status === "accepted") {
      attemptsRef.current = 0;
      pollRef.current = setInterval(() => {
        router.refresh();
        attemptsRef.current += 1;
        if (attemptsRef.current >= 15) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setStatus("idle");
        }
      }, 8000);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [status, router]);

  async function handleClick() {
    setStatus("loading");
    setError("");
    // Capture baseline before research starts
    baselineRef.current = agentResearchAt;
    try {
      await apiFetch<{ status: string; jobId: string }>(
        `/leads/${leadId}/deep-research`,
        token,
        { method: "POST" },
      );
      setStatus("accepted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar pesquisa");
      setStatus("error");
    }
  }

  if (status === "loading") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-purple-400">
        <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
        Enviando para agente...
      </span>
    );
  }

  if (status === "accepted") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
        <CheckIcon className="h-3.5 w-3.5" />
        Pesquisa iniciada — aguarde o resultado
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-xs text-red-400" title={error}>Erro ao iniciar</span>
        <button onClick={() => setStatus("idle")} className="text-xs text-gray-400 hover:text-gray-300">↺</button>
      </span>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/50 bg-purple-950/40 px-3 py-1.5 text-xs font-medium text-purple-300 hover:bg-purple-900/50 hover:border-purple-400 transition-colors"
      title={hasResearch ? "Re-executar pesquisa do agente" : "Aprofundar dados com agente IA"}
    >
      <AgentIcon className="h-3.5 w-3.5" />
      {hasResearch ? "Re-pesquisar com IA" : "Aprofundar com IA"}
    </button>
  );
}

function AgentIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M12 2a4 4 0 0 1 4 4v1h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v1a4 4 0 0 1-8 0v-1H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1V6a4 4 0 0 1 4-4z" />
      <path d="M9 10h.01M15 10h.01M9.5 15a3.5 3.5 0 0 0 5 0" />
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={className}>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
