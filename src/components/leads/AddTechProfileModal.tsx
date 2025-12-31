"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  getActiveTechProfileLanguages,
  getActiveTechProfileFrameworks,
  getActiveTechProfileHosting,
  getActiveTechProfileDatabases,
  getActiveTechProfileERPs,
  getActiveTechProfileCRMs,
  getActiveTechProfileEcommerces,
} from "@/actions/tech-profile-options";
import {
  addLanguageToLead,
  addFrameworkToLead,
  addHostingToLead,
  addDatabaseToLead,
  addERPToLead,
  addCRMToLead,
  addEcommerceToLead,
} from "@/actions/lead-tech-profile";
import {
  addLanguageToOrganization,
  addFrameworkToOrganization,
  addHostingToOrganization,
  addDatabaseToOrganization,
  addERPToOrganization,
  addCRMToOrganization,
  addEcommerceToOrganization,
} from "@/actions/organization-tech-profile";

interface AddTechProfileModalProps {
  entityId: string;
  entityType: "lead" | "organization";
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type TabType = "languages" | "frameworks" | "hosting" | "databases" | "erps" | "crms" | "ecommerces";

interface TechOption {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  icon?: string | null;
  type?: string | null;
}

type TechOptions = Record<TabType, TechOption[]>;

export function AddTechProfileModal({ entityId, entityType, isOpen, onClose, onSuccess }: AddTechProfileModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("languages");
  const [options, setOptions] = useState<Partial<TechOptions>>({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);

  const tabs = [
    { key: "languages" as TabType, label: "Linguagens" },
    { key: "frameworks" as TabType, label: "Frameworks" },
    { key: "hosting" as TabType, label: "Hospedagem" },
    { key: "databases" as TabType, label: "Bancos de Dados" },
    { key: "erps" as TabType, label: "ERPs" },
    { key: "crms" as TabType, label: "CRMs" },
    { key: "ecommerces" as TabType, label: "E-commerce" },
  ];

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [languages, frameworks, hosting, databases, erps, crms, ecommerces] = await Promise.all([
        getActiveTechProfileLanguages(),
        getActiveTechProfileFrameworks(),
        getActiveTechProfileHosting(),
        getActiveTechProfileDatabases(),
        getActiveTechProfileERPs(),
        getActiveTechProfileCRMs(),
        getActiveTechProfileEcommerces(),
      ]);
      setOptions({ languages, frameworks, hosting, databases, erps, crms, ecommerces });
    } catch (error) {
      console.error("Erro ao carregar opções:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (itemId: string) => {
    setAdding(itemId);
    try {
      if (entityType === "lead") {
        switch (activeTab) {
          case "languages": await addLanguageToLead(entityId, itemId); break;
          case "frameworks": await addFrameworkToLead(entityId, itemId); break;
          case "hosting": await addHostingToLead(entityId, itemId); break;
          case "databases": await addDatabaseToLead(entityId, itemId); break;
          case "erps": await addERPToLead(entityId, itemId); break;
          case "crms": await addCRMToLead(entityId, itemId); break;
          case "ecommerces": await addEcommerceToLead(entityId, itemId); break;
        }
      } else {
        switch (activeTab) {
          case "languages": await addLanguageToOrganization(entityId, itemId); break;
          case "frameworks": await addFrameworkToOrganization(entityId, itemId); break;
          case "hosting": await addHostingToOrganization(entityId, itemId); break;
          case "databases": await addDatabaseToOrganization(entityId, itemId); break;
          case "erps": await addERPToOrganization(entityId, itemId); break;
          case "crms": await addCRMToOrganization(entityId, itemId); break;
          case "ecommerces": await addEcommerceToOrganization(entityId, itemId); break;
        }
      }
      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao adicionar";
      alert(message);
    } finally {
      setAdding(null);
    }
  };

  if (!isOpen) return null;

  const currentOptions = options[activeTab] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>

        <h2 className="mb-6 text-2xl font-bold text-gray-900">
          Adicionar Perfil Tecnológico
        </h2>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 overflow-x-auto">
          <nav className="-mb-px flex space-x-4 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-8 text-center text-gray-500">Carregando...</div>
        ) : (
          <div className="space-y-2">
            {currentOptions.length === 0 ? (
              <p className="py-8 text-center text-gray-500">
                Nenhuma opção disponível
              </p>
            ) : (
              currentOptions.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
                >
                  <div className="flex items-center gap-3">
                    {item.color && (
                      <span
                        className="inline-block h-4 w-4 rounded"
                        style={{ backgroundColor: item.color }}
                      />
                    )}
                    {item.icon && <span>{item.icon}</span>}
                    <span className="font-medium text-gray-900">{item.name}</span>
                    {item.type && (
                      <span className="text-xs text-gray-500">({item.type})</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleAdd(item.id)}
                    disabled={adding === item.id}
                    className="rounded-md bg-primary px-3 py-1 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {adding === item.id ? "Adicionando..." : "Adicionar"}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
