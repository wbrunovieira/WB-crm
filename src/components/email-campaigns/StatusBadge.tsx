export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    DRAFT: { label: "Rascunho", className: "bg-gray-500/20 text-gray-300" },
    ACTIVE: { label: "Ativa", className: "bg-green-500/20 text-green-400" },
    PAUSED: { label: "Pausada", className: "bg-yellow-500/20 text-yellow-400" },
    FINISHED: { label: "Finalizada", className: "bg-blue-500/20 text-blue-400" },
  };
  const s = map[status] ?? { label: status, className: "bg-gray-500/20 text-gray-400" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.className}`}>{s.label}</span>
  );
}
