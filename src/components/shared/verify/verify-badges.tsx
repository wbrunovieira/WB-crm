import { CheckIcon, XIcon, WarningIcon, QuestionIcon } from "./verify-icons";

export type EmailBadgeStatus = "valid" | "risky" | "invalid" | "unknown";

function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Maps the raw backend `{ status, valid }` to the UI badge status. */
export function emailBadgeStatus(status: string, valid: boolean): EmailBadgeStatus {
  if (valid) return "valid";
  if (status === "risky") return "risky";
  if (status === "unknown") return "unknown";
  return "invalid";
}

export function EmailStatusBadge({
  status,
  reason,
  verifiedAt,
}: {
  status: EmailBadgeStatus;
  reason: string;
  verifiedAt?: Date | string;
}) {
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
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500" title={reason}>
      <QuestionIcon className="h-3 w-3" />
      Desconhecido{dateStr}
    </span>
  );
}

/** Badge for a freshly verified phone number (shows the detected type inline). */
export function PhoneResultBadge({ label, valid, type }: { label: string; valid: boolean; type: string }) {
  if (valid) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700" title={`${label}: ${type}`}>
        <CheckIcon className="h-3 w-3" />
        {label} válido ({type})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-500" title={`${label}: inválido (${type})`}>
      <XIcon className="h-3 w-3" />
      {label} inválido
    </span>
  );
}

/** Badge for a phone already verified in the DB (type only in the tooltip). */
export function PhoneExistingBadge({ label, valid, type }: { label: string; valid: boolean; type?: string | null }) {
  if (valid) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700" title={`${label}: ${type ?? ""}`}>
        <CheckIcon className="h-3 w-3" />
        {label} válido
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-500" title={`${label}: ${type ?? ""}`}>
      <XIcon className="h-3 w-3" />
      {label} inválido
    </span>
  );
}
