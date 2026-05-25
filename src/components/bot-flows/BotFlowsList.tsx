"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { Bot, Plus, Zap, ZapOff, Trash2, Edit, MessageSquare } from "lucide-react";
import Link from "next/link";

interface BotFlow {
  id: string;
  name: string;
  description?: string;
  instanceName: string;
  isActive: boolean;
  triggerType: string;
  triggerValue?: string;
  createdAt: string;
  nodes: unknown[];
  edges: unknown[];
}

const TRIGGER_LABEL: Record<string, string> = {
  KEYWORD: "Palavra-chave",
  ALL: "Qualquer mensagem",
  CAMPAIGN_REPLY: "Resposta de campanha",
};

export function BotFlowsList({ flows: initial }: { flows: BotFlow[] }) {
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [flows, setFlows] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", instanceName: "", description: "", triggerType: "KEYWORD", triggerValue: "" });

  const refresh = async () => {
    try {
      const list = await apiFetch<BotFlow[]>("/bot-flows", token);
      setFlows(list);
    } catch { /* ignore */ }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.instanceName) { toast.error("Nome e instância são obrigatórios"); return; }
    setCreating(true);
    try {
      const flow = await apiFetch<BotFlow>("/bot-flows", token, {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          instanceName: form.instanceName,
          description: form.description || undefined,
          triggerType: form.triggerType,
          triggerValue: form.triggerType === "KEYWORD" ? form.triggerValue : undefined,
        }),
      });
      toast.success("Flow criado! Abrindo editor...");
      router.push(`/bot-flows/${flow.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar flow");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await apiFetch<{ isActive: boolean }>(`/bot-flows/${id}/toggle`, token, { method: "POST" });
      toast.success(res.isActive ? "Flow ativado" : "Flow desativado");
      await refresh();
    } catch { toast.error("Erro ao alterar status"); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir flow "${name}"?`)) return;
    try {
      await apiFetch(`/bot-flows/${id}`, token, { method: "DELETE" });
      setFlows((p) => p.filter((f) => f.id !== id));
      toast.success("Flow excluído");
    } catch { toast.error("Erro ao excluir"); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Bot size={28} className="text-purple-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Bot Flows WhatsApp</h1>
          <p className="text-sm text-gray-400">Fluxogramas de atendimento automatizado via WhatsApp</p>
        </div>
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 mb-6 space-y-4">
        <h2 className="text-white font-semibold">Novo Flow</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Nome do flow *" required
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
          <input value={form.instanceName} onChange={(e) => setForm((p) => ({ ...p, instanceName: e.target.value }))}
            placeholder="Instância Evolution API *" required
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
          <select value={form.triggerType} onChange={(e) => setForm((p) => ({ ...p, triggerType: e.target.value }))}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
            <option value="KEYWORD">Palavra-chave</option>
            <option value="ALL">Qualquer mensagem</option>
          </select>
          {form.triggerType === "KEYWORD" && (
            <input value={form.triggerValue} onChange={(e) => setForm((p) => ({ ...p, triggerValue: e.target.value }))}
              placeholder='Ex: "oi", "menu", "start"'
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
          )}
        </div>
        <div className="flex gap-3">
          <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Descrição (opcional)"
            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
          <button type="submit" disabled={creating}
            className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors whitespace-nowrap">
            <Plus size={16} /> {creating ? "Criando..." : "Criar e Editar"}
          </button>
        </div>
      </form>

      {/* Flows list */}
      {flows.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Bot size={48} className="mx-auto mb-4 opacity-30" />
          <p>Nenhum flow criado ainda.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {flows.map((flow) => (
            <div key={flow.id} className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold truncate">{flow.name}</h3>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${flow.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                      {flow.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  {flow.description && <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{flow.description}</p>}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><MessageSquare size={11} /> {flow.instanceName}</span>
                <span>·</span>
                <span>{TRIGGER_LABEL[flow.triggerType] ?? flow.triggerType}{flow.triggerValue && `: "${flow.triggerValue}"`}</span>
                <span>·</span>
                <span>{flow.nodes.length} nós</span>
              </div>

              <div className="flex gap-2 mt-auto pt-2 border-t border-gray-700/50">
                <Link href={`/bot-flows/${flow.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-purple-700/40 text-purple-400 text-xs font-medium hover:bg-purple-900/20 transition-colors">
                  <Edit size={13} /> Editar
                </Link>
                <button onClick={() => handleToggle(flow.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    flow.isActive
                      ? "border-yellow-700/40 text-yellow-400 hover:bg-yellow-900/20"
                      : "border-green-700/40 text-green-400 hover:bg-green-900/20"
                  }`}>
                  {flow.isActive ? <ZapOff size={13} /> : <Zap size={13} />}
                  {flow.isActive ? "Pausar" : "Ativar"}
                </button>
                <button onClick={() => handleDelete(flow.id, flow.name)}
                  className="p-1.5 rounded-lg border border-red-900/30 text-red-400 hover:bg-red-900/20 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
