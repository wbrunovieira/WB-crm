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
  action?: ReactNode;
}

export function CollapsibleSection({
  id,
  icon,
  title,
  defaultOpen = true,
  children,
  action,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div id={id} className="mt-6 overflow-hidden rounded-xl bg-white shadow-md border border-purple-900/40">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-wider text-purple-400">
            {icon}
            {title}
          </span>
          <span className="text-purple-600">
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        </button>
        {action && <div className="shrink-0 pr-4">{action}</div>}
      </div>
      {open && (
        <div className="border-t border-purple-900/40 px-6 py-5">
          {children}
        </div>
      )}
    </div>
  );
}
