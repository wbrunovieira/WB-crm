"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { UserListItem } from "@/actions/users";

interface OwnerFilterProps {
  users: UserListItem[];
  currentUserId: string;
}

export function OwnerFilter({ users, currentUserId }: OwnerFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentOwner = searchParams.get("owner") || "all";

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("owner");
    } else {
      params.set("owner", value);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  // Find other users (not current user)
  const otherUsers = users.filter((u) => u.id !== currentUserId);

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-700">Visualizar:</label>
      <select
        value={currentOwner}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="all">Todos</option>
        <option value="mine">Apenas meus</option>
        {otherUsers.map((user) => (
          <option key={user.id} value={user.id}>
            Apenas {user.name}
          </option>
        ))}
      </select>
    </div>
  );
}
