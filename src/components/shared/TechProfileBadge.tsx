"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog, ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface TechItem {
  id: string;
  name: string;
  slug?: string;
  color?: string | null;
  icon?: string | null;
  type?: string | null;
}

interface TechProfileBadgeProps {
  title: string;
  items: TechItem[];
  entityId: string;
  entityType: "lead" | "organization";
  profileType: "languages" | "frameworks" | "hosting" | "databases" | "erps" | "crms" | "ecommerces";
  onUpdate: () => void;
}

const TAB_TO_TYPE: Record<string, string> = {
  languages: "language", frameworks: "framework", hosting: "hosting",
  databases: "database", erps: "erp", crms: "crm", ecommerces: "ecommerce",
};

export function TechProfileBadge({ title, items, entityId, entityType, profileType, onUpdate }: TechProfileBadgeProps) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [removing, setRemoving] = useState<string | null>(null);
  const { confirm, dialogProps } = useConfirmDialog();

  const handleRemove = async (itemId: string, itemName: string) => {
    const confirmed = await confirm({
      title: "Confirmar",
      message: `Remover "${itemName}"?`,
      confirmLabel: "Remover",
      variant: "danger",
    });
    if (!confirmed) return;

    setRemoving(itemId);
    const type = TAB_TO_TYPE[profileType] ?? profileType;
    const base = entityType === "lead" ? `leads/${entityId}` : `organizations/${entityId}`;
    try {
      await apiFetch(`/${base}/tech-profile/${type}/${itemId}`, token, { method: "DELETE" });
      await onUpdate();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao remover";
      toast.error(message);
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
          >
            {item.color && (
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
            )}
            {item.icon && <span className="text-sm">{item.icon}</span>}
            <span className="text-sm font-medium text-gray-900">
              {item.name}
            </span>
            {item.type && (
              <span className="text-xs text-gray-500">({item.type})</span>
            )}
            <button
              onClick={() => handleRemove(item.id, item.name)}
              disabled={removing === item.id}
              className="ml-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
              title="Remover"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
