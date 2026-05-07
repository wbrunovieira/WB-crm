"use client";

import { useState } from "react";

export function ActivityDescriptionExpand({ description }: { description: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
      >
        {open ? "Ocultar descrição" : "Ver descrição"}
      </button>
      {open && (
        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
          {description}
        </p>
      )}
    </div>
  );
}
