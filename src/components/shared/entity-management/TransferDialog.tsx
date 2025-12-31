"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowRightLeft, X, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { transferEntity, getUsersForTransfer, type EntityType } from "@/actions/entity-management";
import { toast } from "sonner";

interface TransferDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  currentOwnerId: string;
  currentOwnerName: string;
  onTransferred?: () => void;
}

export function TransferDialog({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName,
  currentOwnerId,
  currentOwnerName,
  onTransferred,
}: TransferDialogProps) {
  const [users, setUsers] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const availableUsers = await getUsersForTransfer(currentOwnerId);
      setUsers(availableUsers);
    } catch {
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, [currentOwnerId]);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen, loadUsers]);

  async function handleTransfer() {
    if (!selectedUserId) return;

    setTransferring(true);
    try {
      const result = await transferEntity(entityType, entityId, selectedUserId);
      if (result.success) {
        toast.success(result.message);
        onTransferred?.();
        onClose();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao transferir";
      toast.error(message);
    } finally {
      setTransferring(false);
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-purple-500/20 text-purple-300",
      sdr: "bg-blue-500/20 text-blue-300",
      closer: "bg-green-500/20 text-green-300",
    };
    return colors[role] || "bg-gray-500/20 text-gray-300";
  };

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
            <div className="p-2 rounded-lg bg-[#792990]/20">
              <ArrowRightLeft className="h-5 w-5 text-[#792990]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Transferir Proprietário</h2>
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

        {/* Current Owner */}
        <div className="px-6 py-4 bg-[#792990]/10 border-b border-[#792990]/30">
          <p className="text-sm text-gray-400 mb-1">Proprietário Atual</p>
          <p className="text-white font-medium">{currentOwnerName}</p>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
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
                Nenhum usuário encontrado
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-lg transition-all",
                    selectedUserId === user.id
                      ? "bg-[#792990]/30 border border-[#792990]"
                      : "bg-[#350045] border border-transparent hover:border-[#792990]/50"
                  )}
                >
                  <div className="text-left">
                    <p className="text-white font-medium">{user.name}</p>
                    <p className="text-sm text-gray-400">{user.email}</p>
                  </div>
                  <span className={cn("px-2 py-1 rounded text-xs font-medium", getRoleBadge(user.role))}>
                    {user.role.toUpperCase()}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#792990]/30 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleTransfer}
            disabled={!selectedUserId || transferring}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
              selectedUserId
                ? "bg-[#792990] text-white hover:bg-[#792990]/80"
                : "bg-gray-700 text-gray-400 cursor-not-allowed"
            )}
          >
            {transferring ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRightLeft className="h-4 w-4" />
            )}
            {selectedUser ? `Transferir para ${selectedUser.name.split(" ")[0]}` : "Selecione um usuário"}
          </button>
        </div>
      </div>
    </div>
  );
}
