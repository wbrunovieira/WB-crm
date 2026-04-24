"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  id?: string;
  icon: ReactNode;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  accentColor?: "purple" | "gray" | "amber" | "green";
}

const ACCENT = {
  purple: "border-purple-200 text-purple-700",
  gray: "border-gray-200 text-gray-700",
  amber: "border-amber-200 text-amber-700",
  green: "border-green-200 text-green-700",
};

export function CollapsibleSection({
  id,
  icon,
  title,
  defaultOpen = true,
  children,
  accentColor = "purple",
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const accent = ACCENT[accentColor];

  return (
    <div id={id} className="mt-6 rounded-xl bg-white shadow-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between px-6 py-4 border-b transition-colors ${
          open ? accent + " border-opacity-60" : "border-transparent"
        } hover:bg-gray-50 rounded-xl`}
      >
        <span className="flex items-center gap-2.5 text-base font-bold text-gray-900">
          <span className={`text-primary`}>{icon}</span>
          {title}
        </span>
        <span className="text-gray-400">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>
      {open && <div className="px-6 py-5">{children}</div>}
    </div>
  );
}
