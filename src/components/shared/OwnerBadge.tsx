interface OwnerBadgeProps {
  ownerName: string;
  isCurrentUser: boolean;
}

export function OwnerBadge({ ownerName, isCurrentUser }: OwnerBadgeProps) {
  if (isCurrentUser) {
    return null; // Don't show badge for current user's own data
  }

  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
      {ownerName}
    </span>
  );
}
