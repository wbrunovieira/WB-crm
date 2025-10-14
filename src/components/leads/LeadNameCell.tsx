"use client";

import Link from "next/link";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface LeadNameCellProps {
  id: string;
  businessName: string;
  registeredName: string | null;
}

export function LeadNameCell({ id, businessName, registeredName }: LeadNameCellProps) {
  const [copiedBusiness, setCopiedBusiness] = useState(false);
  const [copiedRegistered, setCopiedRegistered] = useState(false);

  const copyToClipboard = async (text: string, type: 'business' | 'registered') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'business') {
        setCopiedBusiness(true);
        setTimeout(() => setCopiedBusiness(false), 2000);
      } else {
        setCopiedRegistered(true);
        setTimeout(() => setCopiedRegistered(false), 2000);
      }
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 group">
        <Link
          href={`/leads/${id}`}
          className="text-lg font-semibold text-gray-400"
        >
          {businessName}
        </Link>
        <button
          onClick={(e) => {
            e.stopPropagation();
            copyToClipboard(businessName, 'business');
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
          title="Copiar nome fantasia"
        >
          {copiedBusiness ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4 text-gray-400" />
          )}
        </button>
      </div>
      {registeredName && (
        <div className="flex items-center gap-2 group">
          <p className="text-xs font-normal text-gray-500 italic">
            {registeredName}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(registeredName, 'registered');
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
            title="Copiar razão social"
          >
            {copiedRegistered ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3 text-gray-400" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
