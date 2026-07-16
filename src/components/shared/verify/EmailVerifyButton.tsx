"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { AtSignIcon, SpinnerIcon, XIcon } from "./verify-icons";
import { EmailStatusBadge, emailBadgeStatus } from "./verify-badges";

interface VerifyResult {
  valid: boolean;
  status: string;
  reason: string;
}

export interface EmailVerifyButtonProps {
  email: string;
  /** POST endpoint that verifies this entity's email (e.g. `/email/verify/lead/:id`). */
  endpoint: string;
  /** Verification already stored in the DB (fields may be null for some entities). */
  verified?: {
    at?: Date | string | null;
    status?: string | null;
    reason?: string | null;
    valid?: boolean | null;
  };
}

/**
 * Generic email verification pill (idle → checking → valid/risky/invalid/unknown → error).
 * The only per-entity difference is the `endpoint` — see the thin wrappers per entity.
 */
export function EmailVerifyButton({ email, endpoint, verified }: EmailVerifyButtonProps) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const router = useRouter();
  const [result, setResult] = useState<VerifyResult | undefined>();

  const { run, loading, error, reset } = useAsyncAction(
    () => apiFetch<VerifyResult>(endpoint, token, { method: "POST" }),
    {
      errorMessage: "Erro ao verificar email",
      onSuccess: (r) => { setResult(r); router.refresh(); },
    },
  );

  const idle = !loading && !result && !error;
  const hasVerified = verified && verified.status && verified.valid !== undefined && verified.valid !== null;

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (idle && hasVerified) {
    const status = emailBadgeStatus(verified!.status!, verified!.valid!);
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        <EmailStatusBadge status={status} reason={verified!.reason ?? ""} verifiedAt={verified!.at ?? undefined} />
        <button onClick={() => run()} className="text-xs text-gray-400 hover:text-purple-600" title="Re-verificar email">
          ↺
        </button>
      </span>
    );
  }
  if (idle) {
    return (
      <button
        onClick={() => run()}
        title={`Verificar email: ${email}`}
        className="inline-flex items-center justify-center rounded-full border border-purple-300/60 bg-purple-50 p-1 text-purple-600 hover:bg-purple-100 hover:border-purple-400 transition-colors"
      >
        <AtSignIcon className="h-3.5 w-3.5" />
      </button>
    );
  }

  // ── Checking ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
        <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
        Verificando...
      </span>
    );
  }

  // ── Result ────────────────────────────────────────────────────────────────
  if (result) {
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        <EmailStatusBadge status={emailBadgeStatus(result.status, result.valid)} reason={result.reason} />
        <button onClick={() => { setResult(undefined); reset(); }} className="text-xs text-gray-400 hover:text-gray-600" title="Limpar">
          ✕
        </button>
      </span>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700" title={error ?? ""}>
        <XIcon className="h-3 w-3" />
        {error || "Erro"}
      </span>
      <button onClick={() => { setResult(undefined); reset(); }} className="text-xs text-gray-400 hover:text-gray-600" title="Tentar novamente">
        ↺
      </button>
    </span>
  );
}
