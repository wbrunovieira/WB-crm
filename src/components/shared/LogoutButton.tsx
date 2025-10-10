"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="p-2 rounded-md text-gray-400 hover:bg-purple-900/50 hover:text-gray-200 transition-colors"
      title="Sair"
    >
      <LogOut className="h-5 w-5" />
    </button>
  );
}
