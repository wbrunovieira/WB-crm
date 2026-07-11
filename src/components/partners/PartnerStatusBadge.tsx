import { PARTNER_STATUS_LABELS, type PartnerStatus } from "@/lib/validations/partner";

const STATUS_CLASSES: Record<PartnerStatus, string> = {
  prospect: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-200 text-gray-600",
};

/**
 * Partner lifecycle badge (prospect / active / inactive). Falls back to a neutral
 * style + the raw value if the backend ever returns an unknown status.
 */
export function PartnerStatusBadge({ status }: { status: string }) {
  const known = status in STATUS_CLASSES ? (status as PartnerStatus) : null;
  const cls = known ? STATUS_CLASSES[known] : "bg-gray-100 text-gray-700";
  const label = known ? PARTNER_STATUS_LABELS[known] : status;

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}
