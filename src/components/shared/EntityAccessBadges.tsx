"use client";

import { User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserInfo {
  id: string;
  name: string;
}

interface EntityAccessBadgesProps {
  owner: UserInfo;
  sharedWith?: UserInfo[];
  currentUserId: string;
  className?: string;
  compact?: boolean;
}

export function EntityAccessBadges({
  owner,
  sharedWith = [],
  currentUserId,
  className,
  compact = false,
}: EntityAccessBadgesProps) {
  const isOwner = owner.id === currentUserId;
  const isSharedWithMe = sharedWith.some((u) => u.id === currentUserId);
  const otherSharedUsers = sharedWith.filter((u) => u.id !== currentUserId);

  // If no badges to show (owner is current user and no shared users)
  if (isOwner && otherSharedUsers.length === 0 && !isSharedWithMe) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {/* Owner Badge */}
      {isOwner ? (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
          title="Você é o proprietário"
        >
          <User className="h-3 w-3" />
          {compact ? "Eu" : "Você"}
        </span>
      ) : (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800"
          title={`Proprietário: ${owner.name}`}
        >
          <User className="h-3 w-3" />
          {owner.name}
        </span>
      )}

      {/* Shared Users Badges */}
      {otherSharedUsers.length > 0 && (
        <>
          {otherSharedUsers.slice(0, compact ? 1 : 2).map((user) => (
            <span
              key={user.id}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
              title={`Compartilhado com: ${user.name}`}
            >
              <Users className="h-3 w-3" />
              {user.name}
            </span>
          ))}
          {otherSharedUsers.length > (compact ? 1 : 2) && (
            <span
              className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
              title={`Mais ${otherSharedUsers.length - (compact ? 1 : 2)} usuário(s)`}
            >
              +{otherSharedUsers.length - (compact ? 1 : 2)}
            </span>
          )}
        </>
      )}

      {/* If shared with current user (and they're not the owner) */}
      {isSharedWithMe && !isOwner && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
          title="Compartilhado com você"
        >
          <Users className="h-3 w-3" />
          {compact ? "Eu" : "Você"}
        </span>
      )}
    </div>
  );
}
