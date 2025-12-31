"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowRightLeft, User, Loader2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransferDialog } from "./TransferDialog";
import { ShareDialog } from "./ShareDialog";
import { SharedUsersList } from "./SharedUsersList";
import { getSharedUsers, type EntityType, type SharedUser } from "@/actions/entity-management";

interface EntityManagementPanelProps {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  ownerId: string;
  ownerName: string;
  ownerEmail?: string;
  isAdmin: boolean;
  className?: string;
}

export function EntityManagementPanel({
  entityType,
  entityId,
  entityName,
  ownerId,
  ownerName,
  ownerEmail,
  isAdmin,
  className,
}: EntityManagementPanelProps) {
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSharedUsers = useCallback(async () => {
    setLoading(true);
    try {
      const users = await getSharedUsers(entityType, entityId);
      setSharedUsers(users);
    } catch (err) {
      console.error("Error loading shared users:", err);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    loadSharedUsers();
  }, [loadSharedUsers]);

  function handleTransferred() {
    window.location.reload();
  }

  function handleShared() {
    loadSharedUsers();
  }

  function handleUnshared() {
    loadSharedUsers();
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Owner Section */}
      <div className="bg-[#1a0022] rounded-xl border border-[#792990]/30 overflow-hidden">
        <div className="px-4 py-3 border-b border-[#792990]/30">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <User className="h-4 w-4 text-[#792990]" />
            Proprietário Atual
          </h3>
        </div>
        <div className="px-4 py-3">
          <p className="text-white font-medium">{ownerName}</p>
          {ownerEmail && (
            <p className="text-sm text-gray-500">{ownerEmail}</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {isAdmin && (
        <div className="grid grid-cols-2 gap-4">
          {/* Transfer Button */}
          <button
            onClick={() => setShowTransferDialog(true)}
            className="flex flex-col items-center gap-3 p-5 rounded-xl bg-gradient-to-br from-[#792990]/20 to-[#792990]/5 border-2 border-[#792990]/40 hover:border-[#792990] hover:from-[#792990]/30 hover:to-[#792990]/10 transition-all group"
          >
            <div className="p-3 rounded-full bg-[#792990]/20 group-hover:bg-[#792990]/30 transition-colors">
              <ArrowRightLeft className="h-6 w-6 text-[#792990]" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-white text-lg">Transferir</p>
              <p className="text-xs text-gray-400 mt-1">
                Move para outro usuário
              </p>
              <p className="text-xs text-gray-500">
                (você perde o acesso)
              </p>
            </div>
          </button>

          {/* Share Button */}
          <button
            onClick={() => setShowShareDialog(true)}
            className="flex flex-col items-center gap-3 p-5 rounded-xl bg-gradient-to-br from-green-600/20 to-green-600/5 border-2 border-green-600/40 hover:border-green-500 hover:from-green-600/30 hover:to-green-600/10 transition-all group"
          >
            <div className="p-3 rounded-full bg-green-600/20 group-hover:bg-green-600/30 transition-colors">
              <UserPlus className="h-6 w-6 text-green-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-white text-lg">Compartilhar</p>
              <p className="text-xs text-gray-400 mt-1">
                Divide com outro usuário
              </p>
              <p className="text-xs text-gray-500">
                (você mantém o acesso)
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Shared Users List */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 text-[#792990] animate-spin" />
        </div>
      ) : (
        <SharedUsersList
          entityType={entityType}
          entityId={entityId}
          sharedUsers={sharedUsers}
          isAdmin={isAdmin}
          onUnshared={handleUnshared}
        />
      )}

      {/* Transfer Dialog */}
      <TransferDialog
        isOpen={showTransferDialog}
        onClose={() => setShowTransferDialog(false)}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
        currentOwnerId={ownerId}
        currentOwnerName={ownerName}
        onTransferred={handleTransferred}
      />

      {/* Share Dialog */}
      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
        onShared={handleShared}
      />
    </div>
  );
}
