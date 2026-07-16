"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { PhoneIcon, SpinnerIcon, XIcon } from "./verify-icons";
import { PhoneResultBadge, PhoneExistingBadge } from "./verify-badges";

interface PhoneResult {
  valid: boolean;
  type: string;
  country: string;
}

interface VerifyResponse {
  ok: boolean;
  phone?: PhoneResult;
  phone2?: PhoneResult;
  whatsapp?: PhoneResult;
}

export interface PhoneVerifyButtonProps {
  /** POST endpoint that verifies this entity's phones (e.g. `/phone/verify/lead/:id`). */
  endpoint: string;
  phone?: string | null;
  phone2?: string | null;
  whatsapp?: string | null;
  /** Verification already stored in the DB. */
  existing?: {
    phoneValid?: boolean | null;
    phoneType?: string | null;
    phone2Valid?: boolean | null;
    phone2Type?: string | null;
    whatsappPhoneValid?: boolean | null;
    whatsappPhoneType?: string | null;
  };
}

/**
 * Generic phone verification pill. Renders a badge per present number
 * (Tel / Tel2 / WA). The only per-entity difference is the `endpoint`.
 */
export function PhoneVerifyButton({ endpoint, phone, phone2, whatsapp, existing }: PhoneVerifyButtonProps) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const router = useRouter();
  const [result, setResult] = useState<VerifyResponse | undefined>();

  const { run, loading, error, reset } = useAsyncAction(
    () => apiFetch<VerifyResponse>(endpoint, token, { method: "POST" }),
    {
      errorMessage: "Erro ao verificar telefone",
      onSuccess: (r) => { setResult(r); router.refresh(); },
    },
  );

  const hasAnyPhone = !!(phone || phone2 || whatsapp);
  if (!hasAnyPhone) return null;

  const idle = !loading && !result && !error;
  const hasExisting = existing && existing.phoneValid !== undefined && existing.phoneValid !== null;

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (idle && hasExisting) {
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        {existing!.phoneValid !== undefined && existing!.phoneValid !== null && phone && (
          <PhoneExistingBadge label="Tel" valid={existing!.phoneValid!} type={existing!.phoneType} />
        )}
        {existing!.phone2Valid !== undefined && existing!.phone2Valid !== null && phone2 && (
          <PhoneExistingBadge label="Tel2" valid={existing!.phone2Valid!} type={existing!.phone2Type} />
        )}
        {existing!.whatsappPhoneValid !== undefined && existing!.whatsappPhoneValid !== null && whatsapp && (
          <PhoneExistingBadge label="WA" valid={existing!.whatsappPhoneValid!} type={existing!.whatsappPhoneType} />
        )}
        <button onClick={() => run()} className="text-xs text-gray-400 hover:text-blue-600" title="Re-verificar telefones">
          ↺
        </button>
      </span>
    );
  }
  if (idle) {
    return (
      <button
        onClick={() => run()}
        title="Verificar formato dos telefones"
        className="inline-flex items-center justify-center rounded-full border border-blue-300/60 bg-blue-50 p-1 text-blue-600 hover:bg-blue-100 hover:border-blue-400 transition-colors"
      >
        <PhoneIcon className="h-3.5 w-3.5" />
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
        {result.phone && <PhoneResultBadge label="Tel" valid={result.phone.valid} type={result.phone.type} />}
        {result.phone2 && <PhoneResultBadge label="Tel2" valid={result.phone2.valid} type={result.phone2.type} />}
        {result.whatsapp && <PhoneResultBadge label="WA" valid={result.whatsapp.valid} type={result.whatsapp.type} />}
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
