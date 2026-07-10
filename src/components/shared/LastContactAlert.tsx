/**
 * "Último contato: há N dias" banner, shown at the top of lead/partner pages.
 * Colour escalates with staleness (green ≤30d, orange ≤60d, red >60d). Renders
 * nothing when there was no contact yet. `lastContactAt` is derived on the
 * backend from the most recent contact-type activity.
 */
export function LastContactAlert({
  lastContactAt,
}: {
  lastContactAt: string | Date | null | undefined;
}) {
  if (!lastContactAt) return null;

  // Elapsed whole days (a contact a few hours ago is "hoje", not "há 1 dia").
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(lastContactAt).getTime()) / (1000 * 60 * 60 * 24)),
  );
  const tone = days > 60 ? "red" : days > 30 ? "orange" : "green";
  const box = {
    red: "bg-red-50 border border-red-200",
    orange: "bg-orange-50 border border-orange-200",
    green: "bg-green-50 border border-green-200",
  }[tone];
  const text = { red: "text-red-800", orange: "text-orange-800", green: "text-green-800" }[tone];
  const label =
    days === 0
      ? "Último contato: hoje"
      : days === 1
        ? "Último contato: há 1 dia"
        : `Último contato: há ${days} dias`;

  return (
    <div className={`mb-6 rounded-lg p-4 ${box}`}>
      <p className={`text-sm font-medium ${text}`}>{label}</p>
    </div>
  );
}
