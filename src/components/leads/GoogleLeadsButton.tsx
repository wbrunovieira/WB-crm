"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { GoogleLeadsModal } from "./GoogleLeadsModal";
import { useRouter } from "next/navigation";

export function GoogleLeadsButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleSuccess(imported: number) {
    router.refresh();
    if (imported === 0) return;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <MapPin className="h-4 w-4 text-primary" />
        Buscar no Google
      </button>

      {open && (
        <GoogleLeadsModal
          onClose={() => setOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
