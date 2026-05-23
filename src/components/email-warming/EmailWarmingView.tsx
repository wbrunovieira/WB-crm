"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Flame, Users, Inbox, History, Play, Trash2, Plus, CheckCircle, PauseCircle } from "lucide-react";

interface AccountStatus {
  id: string;
  email: string;
  isActive: boolean;
  phase: string;
  startedAt: string;
  daysSinceStart: number;
  dailyVolume: number;
  todaySentCount: number;
}

interface PoolEmail {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
}

interface WarmingSendItem {
  id: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  isAutoReply: boolean;
  sentAt: string;
}

interface Props {
  accounts: AccountStatus[];
  poolEmails: PoolEmail[];
  history: WarmingSendItem[];
  historyTotal: number;
}

type Tab = "painel" | "contas" | "pool" | "historico";

export function EmailWarmingView({ accounts, poolEmails, history, historyTotal }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";

  const [activeTab, setActiveTab] = useState<Tab>("painel");
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPoolEmail, setNewPoolEmail] = useState("");
  const [newPoolName, setNewPoolName] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    try {
      await apiFetch("/warming/accounts", token, {
        method: "POST",
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      toast.success("Conta adicionada ao aquecimento");
      setNewEmail("");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar conta");
    }
  };

  const handleRemoveAccount = async (id: string) => {
    try {
      await apiFetch(`/warming/accounts/${id}`, token, { method: "DELETE" });
      toast.success("Conta removida");
      router.refresh();
    } catch {
      toast.error("Erro ao remover conta");
    }
  };

  const handleAddPool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoolEmail.trim()) return;
    try {
      await apiFetch("/warming/pool", token, {
        method: "POST",
        body: JSON.stringify({ email: newPoolEmail.trim(), name: newPoolName.trim() || undefined }),
      });
      toast.success("Email adicionado ao pool");
      setNewPoolEmail("");
      setNewPoolName("");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar email");
    }
  };

  const handleRemovePool = async (id: string) => {
    try {
      await apiFetch(`/warming/pool/${id}`, token, { method: "DELETE" });
      toast.success("Email removido do pool");
      router.refresh();
    } catch {
      toast.error("Erro ao remover email");
    }
  };

  const handleRunCycle = async () => {
    setIsRunning(true);
    try {
      await apiFetch<{ started: boolean }>("/warming/run", token, { method: "POST" });
      toast.success("Ciclo iniciado em background. Os emails serão enviados nos próximos minutos.");
    } catch {
      toast.error("Erro ao iniciar ciclo");
    } finally {
      setIsRunning(false);
    }
  };

  const phaseLabel = (phase: string) => phase === "maintenance" ? "Manutenção" : "Rampa";
  const phaseColor = (phase: string) => phase === "maintenance" ? "text-green-400 bg-green-400/10" : "text-amber-400 bg-amber-400/10";

  const WARMING_STAGES = [
    { label: "Início", days: "Dias 0–13", volume: 10 },
    { label: "Crescendo", days: "Dias 14–27", volume: 20 },
    { label: "Acelerando", days: "Dias 28–41", volume: 40 },
    { label: "Rampa total", days: "Dias 42–55", volume: 80 },
    { label: "Manutenção", days: "Dia 56+", volume: 15 },
  ];

  function getCurrentStageIndex(phase: string, day: number): number {
    if (phase === "maintenance") return 4;
    if (day < 14) return 0;
    if (day < 28) return 1;
    if (day < 42) return 2;
    return 3;
  }

  const totalActiveAccounts = accounts.filter((a) => a.isActive).length;
  const totalSentToday = accounts.reduce((sum, a) => sum + a.todaySentCount, 0);
  const totalDailyVolume = accounts.filter((a) => a.isActive).reduce((sum, a) => sum + a.dailyVolume, 0);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "painel", label: "Painel", icon: <Flame className="h-4 w-4" /> },
    { id: "contas", label: "Contas", icon: <Users className="h-4 w-4" /> },
    { id: "pool", label: "Pool Externo", icon: <Inbox className="h-4 w-4" /> },
    { id: "historico", label: "Histórico", icon: <History className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-800/50 p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-white shadow-sm"
                : "text-gray-400 hover:bg-gray-700/50 hover:text-gray-200"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Painel */}
      {activeTab === "painel" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-5">
              <p className="text-sm text-gray-400">Contas ativas</p>
              <p className="mt-1 text-3xl font-bold text-white">{totalActiveAccounts}</p>
            </div>
            <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-5">
              <p className="text-sm text-gray-400">Enviados hoje</p>
              <p className="mt-1 text-3xl font-bold text-white">{totalSentToday}</p>
              <p className="text-xs text-gray-500">de {totalDailyVolume} previstos</p>
            </div>
            <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-5">
              <p className="text-sm text-gray-400">Pool externo</p>
              <p className="mt-1 text-3xl font-bold text-white">{poolEmails.filter((p) => p.isActive).length}</p>
              <p className="text-xs text-gray-500">emails cadastrados</p>
            </div>
          </div>

          {/* Account cards */}
          {accounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-600 p-12 text-center">
              <Flame className="mx-auto h-10 w-10 text-gray-600" />
              <p className="mt-3 text-gray-400">Nenhuma conta de aquecimento cadastrada</p>
              <button
                onClick={() => setActiveTab("contas")}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                Adicionar conta
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {accounts.map((account) => {
                const stageIndex = getCurrentStageIndex(account.phase, account.daysSinceStart);
                return (
                  <div key={account.id} className="rounded-xl border border-gray-700 bg-gray-800/50 p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white truncate">{account.email}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${phaseColor(account.phase)}`}>
                        {phaseLabel(account.phase)}
                      </span>
                    </div>

                    {/* Warming progression stepper */}
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Progressão de aquecimento</p>
                      <div className="flex items-start gap-1">
                        {WARMING_STAGES.map((stage, i) => {
                          const isActive = i === stageIndex;
                          const isDone = i < stageIndex;
                          return (
                            <div key={i} className="flex flex-col items-center flex-1">
                              {/* Connector line + dot */}
                              <div className="flex items-center w-full">
                                <div className={`h-px flex-1 ${i === 0 ? "invisible" : isDone || isActive ? "bg-primary" : "bg-gray-700"}`} />
                                <div className={`h-3 w-3 rounded-full flex-shrink-0 border-2 transition-colors ${
                                  isActive
                                    ? "border-primary bg-primary shadow-[0_0_6px_#792990]"
                                    : isDone
                                    ? "border-primary bg-primary/40"
                                    : "border-gray-600 bg-gray-800"
                                }`} />
                                <div className={`h-px flex-1 ${i === WARMING_STAGES.length - 1 ? "invisible" : isDone ? "bg-primary" : "bg-gray-700"}`} />
                              </div>
                              {/* Label */}
                              <div className="mt-1 text-center">
                                <p className={`text-[10px] font-medium leading-tight ${isActive ? "text-primary" : isDone ? "text-gray-400" : "text-gray-600"}`}>
                                  {stage.label}
                                </p>
                                <p className={`text-[9px] leading-tight ${isActive ? "text-amber-400" : isDone ? "text-gray-500" : "text-gray-700"}`}>
                                  {stage.volume}/dia
                                </p>
                                {isActive && (
                                  <p className="text-[9px] text-gray-500 leading-tight">{stage.days}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Dia desde início</span>
                        <span className="text-gray-200">{account.daysSinceStart}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Volume hoje</span>
                        <span className="text-gray-200">{account.dailyVolume} emails</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Enviados hoje</span>
                        <span className="text-gray-200">{account.todaySentCount} / {account.dailyVolume}</span>
                      </div>
                      <div className="mt-1">
                        <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${Math.min(100, (account.todaySentCount / account.dailyVolume) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Manual trigger */}
          {accounts.some((a) => a.isActive) && (
            <div className="flex items-center gap-4 rounded-xl border border-gray-700 bg-gray-800/50 p-5">
              <div className="flex-1">
                <p className="font-medium text-white">Executar ciclo agora</p>
                <p className="text-sm text-gray-400">O ciclo automático roda diariamente às 9h. Use isso para testar ou forçar o envio.</p>
              </div>
              <button
                onClick={handleRunCycle}
                disabled={isRunning}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                {isRunning ? "Executando..." : "Executar"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Contas */}
      {activeTab === "contas" && (
        <div className="space-y-6">
          <form onSubmit={handleAddAccount} className="flex gap-3">
            <input
              type="email"
              placeholder="email@gmail.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </button>
          </form>

          <p className="text-xs text-gray-500">
            Adicione apenas contas Gmail que já estão conectadas no sistema (configuradas na página de email).
          </p>

          {accounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-600 p-8 text-center">
              <p className="text-gray-400">Nenhuma conta cadastrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800/50 p-4">
                  <div className="flex items-center gap-3">
                    {account.isActive ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <PauseCircle className="h-5 w-5 text-gray-500" />
                    )}
                    <div>
                      <p className="font-medium text-white">{account.email}</p>
                      <p className="text-xs text-gray-400">
                        {phaseLabel(account.phase)} · Dia {account.daysSinceStart} · {account.dailyVolume} emails/dia
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveAccount(account.id)}
                    className="rounded-lg p-2 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pool externo */}
      {activeTab === "pool" && (
        <div className="space-y-6">
          <form onSubmit={handleAddPool} className="flex gap-3">
            <input
              type="email"
              placeholder="amigo@gmail.com"
              value={newPoolEmail}
              onChange={(e) => setNewPoolEmail(e.target.value)}
              className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-primary focus:outline-none"
            />
            <input
              type="text"
              placeholder="Nome (opcional)"
              value={newPoolName}
              onChange={(e) => setNewPoolName(e.target.value)}
              className="w-40 rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </button>
          </form>

          <p className="text-xs text-gray-500">
            Emails externos para o pool de aquecimento. Podem ser colegas, contas pessoais ou qualquer caixa de entrada real.
          </p>

          {poolEmails.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-600 p-8 text-center">
              <p className="text-gray-400">Nenhum email no pool externo</p>
            </div>
          ) : (
            <div className="space-y-2">
              {poolEmails.map((pe) => (
                <div key={pe.id} className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800/50 p-4">
                  <div>
                    <p className="font-medium text-white">{pe.email}</p>
                    {pe.name && <p className="text-xs text-gray-400">{pe.name}</p>}
                  </div>
                  <button
                    onClick={() => handleRemovePool(pe.id)}
                    className="rounded-lg p-2 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Histórico */}
      {activeTab === "historico" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">{historyTotal} envios registrados</p>

          {history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-600 p-8 text-center">
              <p className="text-gray-400">Nenhum envio registrado ainda</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-800/50">
                    <th className="px-4 py-3 text-left font-medium text-gray-400">De</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-400">Para</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-400">Assunto</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-400">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-400">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {history.map((send) => (
                    <tr key={send.id} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-gray-300 truncate max-w-[150px]">{send.fromEmail}</td>
                      <td className="px-4 py-3 text-gray-300 truncate max-w-[150px]">{send.toEmail}</td>
                      <td className="px-4 py-3 text-gray-400 truncate max-w-[200px]">{send.subject}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${send.isAutoReply ? "bg-blue-400/10 text-blue-400" : "bg-purple-400/10 text-purple-400"}`}>
                          {send.isAutoReply ? "Resposta" : "Envio"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(send.sentAt).toLocaleDateString("pt-BR", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
