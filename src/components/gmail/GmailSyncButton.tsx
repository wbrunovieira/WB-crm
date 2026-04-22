"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface GmailSyncButtonProps {
  revalidateUrl?: string;
}

export default function GmailSyncButton({ revalidateUrl: _revalidateUrl }: GmailSyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await apiFetch<{ processed: number }>("/email/sync", token, { method: "POST" });
      if (result.processed === 0) {
        toast.info("Nenhum e-mail novo");
      } else {
        toast.success(`${result.processed} e-mail${result.processed !== 1 ? "s" : ""} sincronizado${result.processed !== 1 ? "s" : ""}`);
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao sincronizar e-mails");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      title="Sincronizar e-mails agora"
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-all disabled:opacity-50"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
      {syncing ? "Sincronizando..." : "Sync e-mails"}
    </button>
  );
}
