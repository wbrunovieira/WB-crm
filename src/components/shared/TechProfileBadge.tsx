"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  removeLanguageFromLead,
  removeFrameworkFromLead,
  removeHostingFromLead,
  removeDatabaseFromLead,
  removeERPFromLead,
  removeCRMFromLead,
  removeEcommerceFromLead,
} from "@/actions/lead-tech-profile";
import {
  removeLanguageFromOrganization,
  removeFrameworkFromOrganization,
  removeHostingFromOrganization,
  removeDatabaseFromOrganization,
  removeERPFromOrganization,
  removeCRMFromOrganization,
  removeEcommerceFromOrganization,
} from "@/actions/organization-tech-profile";

interface TechProfileBadgeProps {
  title: string;
  items: any[];
  entityId: string;
  entityType: "lead" | "organization";
  profileType: "languages" | "frameworks" | "hosting" | "databases" | "erps" | "crms" | "ecommerces";
  onUpdate: () => void;
}

export function TechProfileBadge({ title, items, entityId, entityType, profileType, onUpdate }: TechProfileBadgeProps) {
  const [removing, setRemoving] = useState<string | null>(null);

  const handleRemove = async (itemId: string, itemName: string) => {
    if (!confirm(`Remover "${itemName}"?`)) return;

    setRemoving(itemId);
    try {
      if (entityType === "lead") {
        switch (profileType) {
          case "languages": await removeLanguageFromLead(entityId, itemId); break;
          case "frameworks": await removeFrameworkFromLead(entityId, itemId); break;
          case "hosting": await removeHostingFromLead(entityId, itemId); break;
          case "databases": await removeDatabaseFromLead(entityId, itemId); break;
          case "erps": await removeERPFromLead(entityId, itemId); break;
          case "crms": await removeCRMFromLead(entityId, itemId); break;
          case "ecommerces": await removeEcommerceFromLead(entityId, itemId); break;
        }
      } else {
        switch (profileType) {
          case "languages": await removeLanguageFromOrganization(entityId, itemId); break;
          case "frameworks": await removeFrameworkFromOrganization(entityId, itemId); break;
          case "hosting": await removeHostingFromOrganization(entityId, itemId); break;
          case "databases": await removeDatabaseFromOrganization(entityId, itemId); break;
          case "erps": await removeERPFromOrganization(entityId, itemId); break;
          case "crms": await removeCRMFromOrganization(entityId, itemId); break;
          case "ecommerces": await removeEcommerceFromOrganization(entityId, itemId); break;
        }
      }
      await onUpdate();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao remover";
      alert(message);
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
    </div>
  );
}
