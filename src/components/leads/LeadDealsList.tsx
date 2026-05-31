"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TrendingUp, Plus, Trophy, ExternalLink, Tag, Layers, Pencil, X, Loader2, Check } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface DealItem {
  id: string;
  title: string;
  value: number;
  currency: string;
  status: string;
  stage: { id: string; name: string; pipeline?: { id: string; name: string } } | null;
  contact: { id: string; name: string } | null;
  _count: { activities: number };
}

interface Props {
  deals: DealItem[];
  leadId: string;
  leadName: string;
}

const statusLabel: Record<string, { label: string; cls: string }> = {
  open:  { label: "Aberto", cls: "bg-blue-900/40 text-blue-300 border-blue-700/40" },
  won:   { label: "Ganho",  cls: "bg-green-900/40 text-green-300 border-green-700/40" },
  lost:  { label: "Perdido",cls: "bg-red-900/40 text-red-300 border-red-700/40" },
};

const inputCls = "w-full rounded-lg border border-[#3d2b4d] bg-[#2d1b3d] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none";
const selectCls = inputCls + " cursor-pointer";

function DealEditModal({ deal, onClose }: { deal: DealItem; onClose: () => void }) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: deal.title,
    value: String(deal.value ?? 0),
    currency: deal.currency || "BRL",
    status: deal.status || "open",
  });

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("O título do negócio é obrigatório.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/deals/${deal.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          title: form.title.trim(),
          value: form.value ? Number(form.value) : 0,
          currency: form.currency,
          status: form.status,
        }),
      });
      toast.success("Negócio atualizado.");
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar negócio.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-[#3d2b4d] bg-[#1a0022] shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-[#3d2b4d] px-5 py-4 flex-shrink-0">
          <h2 className="text-sm font-semibold text-white">Editar Negócio</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Título *</label>
            <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Valor</label>
              <input type="number" min="0" step="0.01" className={inputCls} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Moeda</label>
              <select className={selectCls} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                <option value="BRL">BRL (R$)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Status</label>
            <select className={selectCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="open">Aberto</option>
              <option value="won">Ganho</option>
              <option value="lost">Perdido</option>
            </select>
          </div>
          {deal.stage && (
            <p className="text-xs text-gray-500">
              Etapa atual: {deal.stage.pipeline?.name} › {deal.stage.name}. Para mover de etapa, use o pipeline ou a página do negócio.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-[#3d2b4d] px-5 py-4 flex-shrink-0">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 hover:text-white">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

export function LeadDealsList({ deals, leadId }: Props) {
  const [editing, setEditing] = useState<DealItem | null>(null);

  const formatCurrency = (value: number, currency: string) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL" }).format(value);

  return (
    <div className="rounded-xl border border-purple-900/40 bg-[#120019] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400 border-b border-purple-900/40 pb-3 w-full">
          <TrendingUp size={14} />
          Negócios
          <span className="ml-1 rounded-full bg-purple-900/40 px-2 py-0.5 text-xs font-semibold text-purple-300">
            {deals.length}
          </span>
          <Link
            href={`/deals/new?leadId=${leadId}&returnTo=/leads/${leadId}`}
            className="ml-auto flex items-center gap-1 rounded-lg bg-purple-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-600 transition-colors"
          >
            <Plus size={12} />
            Novo Negócio
          </Link>
        </h2>
      </div>

      {deals.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">Nenhum negócio vinculado</p>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => {
            const st = statusLabel[deal.status] ?? statusLabel.open;
            return (
              <div
                key={deal.id}
                className="flex items-center justify-between rounded-lg border border-purple-900/30 bg-purple-950/30 px-4 py-3 hover:bg-purple-900/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {deal.status === "won" && <Trophy size={13} className="text-green-400 flex-shrink-0" />}
                    <Link
                      href={`/deals/${deal.id}`}
                      className="text-sm font-semibold text-gray-100 hover:text-purple-300 transition-colors truncate"
                    >
                      {deal.title}
                    </Link>
                    <span className={`text-xs border rounded-full px-2 py-0.5 ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    {deal.stage && (
                      <span className="flex items-center gap-1">
                        <Layers size={10} />
                        {deal.stage.pipeline?.name} › {deal.stage.name}
                      </span>
                    )}
                    {deal.contact && (
                      <span className="flex items-center gap-1">
                        <Tag size={10} />
                        {deal.contact.name}
                      </span>
                    )}
                    <span>{deal._count.activities} atividade{deal._count.activities !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold text-purple-300">
                    {formatCurrency(deal.value, deal.currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditing(deal)}
                    className="rounded p-1 text-gray-500 hover:text-purple-300 transition-colors"
                    title="Editar negócio"
                  >
                    <Pencil size={14} />
                  </button>
                  <Link
                    href={`/deals/${deal.id}`}
                    className="rounded p-1 text-gray-500 hover:text-purple-300 transition-colors"
                    title="Ver negócio"
                  >
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && <DealEditModal deal={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
