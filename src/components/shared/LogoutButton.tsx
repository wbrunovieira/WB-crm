"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-900 hover:text-white transition-colors"
    >
      Sair
    </button>
  );
}
