"use client";

import { useState, useEffect, useCallback } from "react";
import { Share2, X, Loader2, Search, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { shareEntity, getAvailableUsersForSharing, type EntityType } from "@/actions/entity-management";
import { toast } from "sonner";

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  onShared?: () => void;
}

export function ShareDialog({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName,
  onShared,
}: ShareDialogProps) {
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const availableUsers = await getAvailableUsersForSharing(entityType, entityId);
      setUsers(availableUsers);
    } catch {
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setSelectedUserIds([]);
    }
  }, [isOpen, loadUsers]);

  function toggleUser(userId: string) {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  async function handleShare() {
    if (selectedUserIds.length === 0) return;

    setSharing(true);
    try {
      let successCount = 0;
      for (const userId of selectedUserIds) {
        try {
          await shareEntity(entityType, entityId, userId);
          successCount++;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Erro desconhecido";
          toast.error(`Erro ao compartilhar: ${message}`);
        }
      }
      if (successCount > 0) {
        toast.success(`Compartilhado com ${successCount} usuário(s)`);
        onShared?.();
        onClose();
      }
    } finally {
      setSharing(false);
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-[#1a0022] border border-[#792990]/50 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#792990]/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Share2 className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Compartilhar</h2>
              <p className="text-sm text-gray-400">{entityName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#792990]/20 transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-400 mb-4">
            Selecione os usuários que terão acesso a este registro.
            Eles poderão visualizar, mas não editar.
          </p>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar usuário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#350045] border border-[#792990]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#792990]"
            />
          </div>

          {/* User List */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 text-[#792990] animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {users.length === 0
                  ? "Todos os usuários já têm acesso"
                  : "Nenhum usuário encontrado"}
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-lg transition-all",
                    selectedUserIds.includes(user.id)
                      ? "bg-green-500/20 border border-green-500/50"
                      : "bg-[#350045] border border-transparent hover:border-[#792990]/50"
                  )}
                >
                  <div className="text-left">
                    <p className="text-white font-medium">{user.name}</p>
                    <p className="text-sm text-gray-400">{user.email}</p>
                  </div>
                  <div
                    className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                      selectedUserIds.includes(user.id)
                        ? "bg-green-500 border-green-500"
                        : "border-gray-500"
                    )}
                  >
                    {selectedUserIds.includes(user.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#792990]/30 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {selectedUserIds.length > 0 && (
              <span>{selectedUserIds.length} usuário(s) selecionado(s)</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleShare}
              disabled={selectedUserIds.length === 0 || sharing}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                selectedUserIds.length > 0
                  ? "bg-green-600 text-white hover:bg-green-500"
                  : "bg-gray-700 text-gray-400 cursor-not-allowed"
              )}
            >
              {sharing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Compartilhar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
