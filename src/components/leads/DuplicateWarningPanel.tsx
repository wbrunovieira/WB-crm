import Link from "next/link";
import type { LeadDuplicates, LeadSummary } from "./lead-form-types";

const DUPLICATE_LABELS: Record<keyof LeadDuplicates, string> = {
  cnpj:    "Mesmo CNPJ",
  name:    "Nome similar",
  phone:   "Mesmo telefone / WhatsApp",
  email:   "Mesmo e-mail",
  address: "Mesmo logradouro e cidade",
};

export function DuplicateWarningPanel({
  duplicates,
  onConfirm,
  onCancel,
  isSubmitting,
}: {
  duplicates: LeadDuplicates;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const categories = (Object.keys(duplicates) as (keyof LeadDuplicates)[]).filter(
    (k) => duplicates[k].length > 0
  );

  return (
    <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <span className="text-yellow-400 text-xl leading-none mt-0.5">⚠</span>
        <div>
          <p className="font-semibold text-yellow-300">Possíveis leads duplicados encontrados</p>
          <p className="text-sm text-yellow-200/70 mt-0.5">
            Revise os leads abaixo antes de salvar. Você pode abrir cada um para conferir ou
            ignorar e criar mesmo assim.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {categories.map((category) => (
          <div key={category}>
            <p className="text-xs font-semibold uppercase tracking-wide text-yellow-400/80 mb-1.5">
              {DUPLICATE_LABELS[category]}
            </p>
            <ul className="space-y-1">
              {duplicates[category].map((lead: LeadSummary) => (
                <li key={lead.leadId} className="flex items-center gap-2 text-sm">
                  <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${lead.isArchived ? "bg-gray-400" : "bg-green-400"}`} />
                  <Link
                    href={`/leads/${lead.leadId}`}
                    target="_blank"
                    className="text-yellow-200 hover:underline font-medium"
                  >
                    {lead.businessName}
                  </Link>
                  {lead.companyRegistrationID && (
                    <span className="text-yellow-200/50 font-mono text-xs">{lead.companyRegistrationID}</span>
                  )}
                  {lead.city && (
                    <span className="text-yellow-200/50 text-xs">{lead.city}{lead.state ? ` / ${lead.state}` : ""}</span>
                  )}
                  {lead.isArchived && (
                    <span className="text-xs text-gray-400 italic">(arquivado)</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-black hover:bg-yellow-400 disabled:opacity-50"
        >
          {isSubmitting ? "Salvando..." : "Criar mesmo assim"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-[#2d1b3d]"
        >
          Voltar e revisar
        </button>
      </div>
    </div>
  );
}
