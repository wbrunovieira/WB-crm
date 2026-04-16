"use client";

import { useState } from "react";
import { checkWhatsApp, saveWhatsAppNumber } from "@/actions/whatsapp";
import { useRouter } from "next/navigation";

interface WhatsAppCheckButtonProps {
  phone: string;
  entityType: "lead" | "contact";
  entityId: string;
  /** Se true, ao encontrar WhatsApp no campo telefone, oferece salvar no campo whatsapp */
  canSave?: boolean;
}

type Status = "idle" | "checking" | "found" | "not_found" | "error" | "saving" | "saved";

export function WhatsAppCheckButton({
  phone,
  entityType,
  entityId,
  canSave = false,
}: WhatsAppCheckButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [verifiedNumber, setVerifiedNumber] = useState<string | undefined>();
  const [errorMsg, setErrorMsg] = useState<string>("");
  const router = useRouter();

  async function handleCheck() {
    setStatus("checking");
    setErrorMsg("");

    const result = await checkWhatsApp(phone);

    if (!result.success) {
      setStatus("error");
      setErrorMsg(result.error ?? "Erro desconhecido");
      return;
    }

    if (result.exists) {
      setStatus("found");
      setVerifiedNumber(result.number ?? phone.replace(/\D/g, ""));
    } else {
      setStatus("not_found");
    }
  }

  async function handleSave() {
    if (!verifiedNumber) return;
    setStatus("saving");

    const formatted = verifiedNumber.startsWith("+")
      ? verifiedNumber
      : `+${verifiedNumber}`;

    const result = await saveWhatsAppNumber(entityType, entityId, formatted);

    if (result.success) {
      setStatus("saved");
      router.refresh();
    } else {
      setStatus("error");
      setErrorMsg(result.error ?? "Erro ao salvar");
    }
  }

  if (status === "idle") {
    return (
      <button
        onClick={handleCheck}
        title="Verificar se tem WhatsApp"
        className="inline-flex items-center justify-center rounded-full border border-[#25D366]/40 bg-[#25D366]/10 p-1 text-[#128C7E] hover:bg-[#25D366]/20 hover:border-[#25D366] transition-colors"
      >
        <SearchIcon className="h-3.5 w-3.5" />
      </button>
    );
  }

  if (status === "checking") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
        <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
        Verificando...
      </span>
    );
  }

  if (status === "found") {
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#25D366]/15 px-2 py-0.5 text-xs font-medium text-[#128C7E]">
          <CheckIcon className="h-3 w-3" />
          Tem WhatsApp
        </span>
        {canSave && (
          <button
            onClick={handleSave}
            className="text-xs text-[#128C7E] underline hover:no-underline"
          >
            Salvar no campo WhatsApp
          </button>
        )}
        <button onClick={() => setStatus("idle")} className="text-xs text-gray-400 hover:text-gray-600" title="Limpar">
          ✕
        </button>
      </span>
    );
  }

  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
        <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
        Salvando...
      </span>
    );
  }

  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <CheckIcon className="h-3 w-3" />
        Salvo!
      </span>
    );
  }

  if (status === "not_found") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
          <XIcon className="h-3 w-3" />
          Sem WhatsApp
        </span>
        <button onClick={() => setStatus("idle")} className="text-xs text-gray-400 hover:text-gray-600" title="Limpar">
          ✕
        </button>
      </span>
    );
  }

  // error
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700" title={errorMsg}>
        <XIcon className="h-3 w-3" />
        Erro
      </span>
      <button onClick={() => setStatus("idle")} className="text-xs text-gray-400 hover:text-gray-600" title="Tentar novamente">
        ↺
      </button>
    </span>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={className}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
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
