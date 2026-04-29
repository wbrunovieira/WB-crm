"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Target } from "lucide-react";
import { LeadFocusedResearchModal } from "./LeadFocusedResearchModal";

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
  metaAds?: string | null;
}

interface Props {
  leadId: string;
  lead: LeadSnapshot;
  agentResearchAt?: string | null;
}

export function LeadFocusedResearchButton({ leadId, lead, agentResearchAt }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);
  const baselineRef = useRef<string | null | undefined>(undefined);

  // Detect completion — same pattern as LeadDeepResearchButton
  useEffect(() => {
    if (!waiting) return;
    if (baselineRef.current === undefined) return;

    if (agentResearchAt !== baselineRef.current) {
      clearInterval(pollRef.current!);
      pollRef.current = null;
      setWaiting(false);
      toast.success("Pesquisa focada concluída!", {
        description: "O campo selecionado foi atualizado com o resultado do agente.",
        duration: Infinity,
        action: { label: "OK", onClick: () => {} },
      });
    }
  }, [agentResearchAt, waiting]);

  useEffect(() => {
    if (waiting) {
      attemptsRef.current = 0;
      pollRef.current = setInterval(() => {
        router.refresh();
        attemptsRef.current += 1;
        if (attemptsRef.current >= 20) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setWaiting(false);
        }
      }, 8000);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [waiting, router]);

  function handleStarted() {
    baselineRef.current = agentResearchAt;
    setWaiting(true);
    setShowModal(false);
  }

  if (waiting) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
        <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
        Pesquisa focada em andamento…
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/50 bg-blue-950/40 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-900/50 hover:border-blue-400 transition-colors"
        title="Pesquisa IA direcionada a um campo específico"
      >
        <Target className="h-3.5 w-3.5" />
        Pesquisa Focada
      </button>

      {showModal && (
        <LeadFocusedResearchModal
          leadId={leadId}
          lead={lead}
          onClose={() => setShowModal(false)}
          onStarted={handleStarted}
        />
      )}
    </>
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
