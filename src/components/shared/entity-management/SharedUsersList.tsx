"use client";

import { useState } from "react";
import { Users, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import type { EntityType, SharedUser } from "./EntityManagementPanel";

interface SharedUsersListProps {
  entityType: EntityType;
  entityId: string;
  sharedUsers: SharedUser[];
  isAdmin: boolean;
  onUnshared?: () => void;
}

export function SharedUsersList({
  entityType: _entityType,
  entityId: _entityId,
  sharedUsers,
  isAdmin,
  onUnshared,
}: SharedUsersListProps) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleRemove(shareId: string) {
    setRemovingId(shareId);
    try {
      await apiFetch(`/shared-entities/${shareId}`, token, { method: "DELETE" });
      toast.success("Compartilhamento removido");
      onUnshared?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao remover compartilhamento";
      toast.error(message);
    } finally {
      setRemovingId(null);
    }
  }

  if (sharedUsers.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#1a0022] rounded-xl border border-[#792990]/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-[#792990]/30 flex items-center gap-2">
        <Users className="h-4 w-4 text-[#792990]" />
        <h3 className="text-sm font-medium text-white">
          Compartilhado com ({sharedUsers.length})
        </h3>
      </div>
      <div className="divide-y divide-[#792990]/10">
        {sharedUsers.map((share) => (
          <div
            key={share.shareId}
            className="px-4 py-3 flex items-center justify-between hover:bg-[#792990]/5 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-white font-medium truncate">
                {share.userName}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {share.userEmail}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Compartilhado em{" "}
                {new Date(share.sharedAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => handleRemove(share.shareId)}
                disabled={removingId === share.shareId}
                className={cn(
                  "ml-3 p-2 rounded-lg transition-colors",
                  "text-gray-400 hover:text-red-400 hover:bg-red-500/10",
                  removingId === share.shareId && "opacity-50"
                )}
                title="Remover acesso"
              >
                {removingId === share.shareId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
