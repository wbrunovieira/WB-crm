"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { useRouter } from "next/navigation";

interface LeadEmailVerifyButtonProps {
  email: string;
  leadId: string;
  /** Dados de verificação já existentes (vindos do banco) */
  verified?: {
    at: Date | string;
    status: string;
    reason: string;
    valid: boolean;
  };
}

interface VerifyResult {
  leadId: string;
  email: string;
  valid: boolean;
  status: string;
  reason: string;
}

type Status = "idle" | "checking" | "valid" | "invalid" | "risky" | "unknown" | "error";

function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function statusToUiStatus(status: string, valid: boolean): Status {
  if (valid) return "valid";
  if (status === "risky") return "risky";
  if (status === "unknown") return "unknown";
  return "invalid";
}

export function LeadEmailVerifyButton({
  email,
  leadId,
  verified,
}: LeadEmailVerifyButtonProps) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [uiStatus, setUiStatus] = useState<Status>("idle");
  const [verifyResult, setVerifyResult] = useState<VerifyResult | undefined>();
  const [errorMsg, setErrorMsg] = useState<string>("");
  const router = useRouter();

  // Already verified previously — show static badge with re-verify option
  if (uiStatus === "idle" && verified) {
    const badgeStatus = statusToUiStatus(verified.status, verified.valid);
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        <BadgeForStatus status={badgeStatus} reason={verified.reason} verifiedAt={verified.at} />
        <button
          onClick={handleVerify}
          className="text-xs text-gray-400 hover:text-purple-600"
          title="Re-verificar email"
        >
          ↺
        </button>
      </span>
    );
  }

  async function handleVerify() {
    setUiStatus("checking");
    setErrorMsg("");

    try {
      const result = await apiFetch<{ ok: boolean; leadId: string; email: string; valid: boolean; status: string; reason: string }>(
        `/email/verify/lead/${leadId}`,
        token,
        { method: "POST" },
      );
      setVerifyResult(result);
      setUiStatus(statusToUiStatus(result.status, result.valid));
      router.refresh();
    } catch (err) {
      setUiStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Erro ao verificar email");
    }
  }

  if (uiStatus === "idle") {
    return (
      <button
        onClick={handleVerify}
        title={`Verificar email: ${email}`}
        className="inline-flex items-center justify-center rounded-full border border-purple-300/60 bg-purple-50 p-1 text-purple-600 hover:bg-purple-100 hover:border-purple-400 transition-colors"
      >
        <AtSignIcon className="h-3.5 w-3.5" />
      </button>
    );
  }

  if (uiStatus === "checking") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
        <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
        Verificando...
      </span>
    );
  }

  if (verifyResult && (uiStatus === "valid" || uiStatus === "invalid" || uiStatus === "risky" || uiStatus === "unknown")) {
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        <BadgeForStatus status={uiStatus} reason={verifyResult.reason} />
        <button
          onClick={() => { setUiStatus("idle"); setVerifyResult(undefined); }}
          className="text-xs text-gray-400 hover:text-gray-600"
          title="Limpar"
        >
          ✕
        </button>
      </span>
    );
  }

  // error
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700"
        title={errorMsg}
      >
        <XIcon className="h-3 w-3" />
        {errorMsg || "Erro"}
      </span>
      <button
        onClick={() => { setUiStatus("idle"); setErrorMsg(""); }}
        className="text-xs text-gray-400 hover:text-gray-600"
        title="Tentar novamente"
      >
        ↺
      </button>
    </span>
  );
}

function BadgeForStatus({ status, reason, verifiedAt }: { status: Status; reason: string; verifiedAt?: Date | string }) {
  const dateStr = verifiedAt ? ` · ${formatDate(verifiedAt)}` : "";

  if (status === "valid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700" title={reason}>
        <CheckIcon className="h-3 w-3" />
        Email válido{dateStr}
      </span>
    );
  }
  if (status === "risky") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700" title={reason}>
        <WarningIcon className="h-3 w-3" />
        Arriscado{dateStr}
      </span>
    );
  }
  if (status === "invalid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-500" title={reason}>
        <XIcon className="h-3 w-3" />
        Inválido{dateStr}
      </span>
    );
  }
  // unknown
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500" title={reason}>
      <QuestionIcon className="h-3 w-3" />
      Desconhecido{dateStr}
    </span>
  );
}

function AtSignIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={className}>
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

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className={className}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={className}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  );
}

function QuestionIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
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
