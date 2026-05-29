"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useRouter } from "next/navigation";

interface PhoneResult {
  valid: boolean;
  type: string;
  country: string;
}

interface LeadContactPhoneVerifyButtonProps {
  leadContactId: string;
  phone?: string | null;
  /** Dados já existentes do banco */
  existing?: {
    phoneValid?: boolean | null;
    phoneType?: string | null;
  };
}

interface VerifyResponse {
  ok: boolean;
  leadContactId: string;
  phone?: PhoneResult;
}

type Status = "idle" | "checking" | "done" | "error";

/** Maps a failed verification request to a friendly pt-BR message by HTTP status. */
function messageForError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.status) {
      case 403:
        return "Você não tem permissão para verificar este contato";
      case 404:
        return "Contato não encontrado";
      case 502:
      case 503:
        return "Serviço de verificação indisponível. Tente novamente.";
    }
  }
  return err instanceof Error ? err.message : "Erro ao verificar telefone";
}

function PhoneBadge({ result }: { result: PhoneResult }) {
  if (result.valid) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700" title={`Tel: ${result.type}`}>
        <CheckIcon className="h-3 w-3" />
        Tel válido ({result.type})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-500" title={`Tel: inválido (${result.type})`}>
      <XIcon className="h-3 w-3" />
      Tel inválido
    </span>
  );
}

function ExistingBadge({ valid, type }: { valid: boolean; type?: string | null }) {
  if (valid) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700" title={type ?? ""}>
        <CheckIcon className="h-3 w-3" />
        Tel válido
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-500" title={type ?? ""}>
      <XIcon className="h-3 w-3" />
      Tel inválido
    </span>
  );
}

export function LeadContactPhoneVerifyButton({
  leadContactId,
  phone,
  existing,
}: LeadContactPhoneVerifyButtonProps) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [uiStatus, setUiStatus] = useState<Status>("idle");
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | undefined>();
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  if (!phone) return null;

  const hasExisting = existing && existing.phoneValid !== undefined && existing.phoneValid !== null;

  async function handleVerify() {
    setUiStatus("checking");
    setErrorMsg("");

    try {
      const result = await apiFetch<VerifyResponse>(
        `/phone/verify/lead-contact/${leadContactId}`,
        token,
        { method: "POST" },
      );
      setVerifyResult(result);
      setUiStatus("done");
      router.refresh();
    } catch (err) {
      setUiStatus("error");
      setErrorMsg(messageForError(err));
    }
  }

  if (uiStatus === "idle" && hasExisting) {
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        <ExistingBadge valid={existing!.phoneValid!} type={existing!.phoneType} />
        <button
          onClick={handleVerify}
          className="text-xs text-gray-400 hover:text-purple-600"
          title="Re-verificar telefone"
        >
          ↺
        </button>
      </span>
    );
  }

  if (uiStatus === "idle") {
    return (
      <button
        onClick={handleVerify}
        title="Verificar formato do telefone"
        className="inline-flex items-center justify-center rounded-full border border-blue-300/60 bg-blue-50 p-1 text-blue-600 hover:bg-blue-100 hover:border-blue-400 transition-colors"
      >
        <PhoneIcon className="h-3.5 w-3.5" />
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

  if (uiStatus === "done" && verifyResult) {
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        {verifyResult.phone && <PhoneBadge result={verifyResult.phone} />}
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

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700" title={errorMsg}>
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

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={className}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
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

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} strokeOpacity={0.25} />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}
