"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { CalendarClock, Check } from "lucide-react";

/**
 * Gera (via /scheduling/links) e copia o link de auto-agendamento do parceiro.
 * O agendamento fica vinculado ao parceiro (não cria lead); a confirmação vai
 * para o e-mail do parceiro e para o dono. Se não houver tipo de reunião, o
 * backend cria um padrão automaticamente.
 */
export function CopyBookingLinkButton({ partnerId }: { partnerId: string }) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string; link: string }>("/scheduling/links", token, {
        method: "POST",
        body: JSON.stringify({ partnerId }),
      });
      try {
        await navigator.clipboard.writeText(res.link);
        setCopied(true);
        toast.success("Link de agendamento copiado!", { description: res.link });
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // Clipboard pode falhar (permissão) — mostra o link pra copiar manualmente
        toast.success("Link de agendamento gerado", { description: res.link });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar link de agendamento");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={generate}
      disabled={loading}
      title="Gerar e copiar o link de agendamento deste parceiro"
      className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg bg-[#e8531e] px-3 py-1.5 text-xs sm:text-sm font-semibold text-white hover:brightness-110 transition disabled:opacity-50"
    >
      {copied ? <Check size={13} /> : <CalendarClock size={13} />}
      <span className="hidden sm:inline">{loading ? "Gerando..." : copied ? "Copiado!" : "Link de agenda"}</span>
    </button>
  );
}
