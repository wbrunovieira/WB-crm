"use client";

import { useState, useMemo } from "react";
import { TechProfileGenericForm } from "./TechProfileGenericForm";
import { TechProfileGenericList } from "./TechProfileGenericList";
import { useTechOptions, type TechOptionType } from "@/hooks/admin/use-admin";

type Tab = "languages" | "frameworks" | "hosting" | "databases" | "erps" | "crms" | "ecommerces";

const TYPE_MAP: Record<Tab, TechOptionType> = {
  languages: "profile-language",
  frameworks: "profile-framework",
  hosting: "profile-hosting",
  databases: "profile-database",
  erps: "profile-erp",
  crms: "profile-crm",
  ecommerces: "profile-ecommerce",
};

export function TechProfileManager() {
  const [activeTab, setActiveTab] = useState<Tab>("languages");

  const { data: languages = [] } = useTechOptions("profile-language");
  const { data: frameworks = [] } = useTechOptions("profile-framework");
  const { data: hosting = [] } = useTechOptions("profile-hosting");
  const { data: databases = [] } = useTechOptions("profile-database");
  const { data: erps = [] } = useTechOptions("profile-erp");
  const { data: crms = [] } = useTechOptions("profile-crm");
  const { data: ecommerces = [] } = useTechOptions("profile-ecommerce");

  const tabs = [
    { key: "languages" as Tab, label: "Linguagens", count: languages.length },
    { key: "frameworks" as Tab, label: "Frameworks", count: frameworks.length },
    { key: "hosting" as Tab, label: "Hospedagem", count: hosting.length },
    { key: "databases" as Tab, label: "Bancos de Dados", count: databases.length },
    { key: "erps" as Tab, label: "ERPs", count: erps.length },
    { key: "crms" as Tab, label: "CRMs", count: crms.length },
    { key: "ecommerces" as Tab, label: "E-commerce", count: ecommerces.length },
  ];

  const getActiveItems = () => {
    switch (activeTab) {
      case "languages": return languages;
      case "frameworks": return frameworks;
      case "hosting": return hosting;
      case "databases": return databases;
      case "erps": return erps;
      case "crms": return crms;
      case "ecommerces": return ecommerces;
    }
  };

  // Get used orders for the active tab
  const usedOrders = useMemo(() => {
    return getActiveItems().map((item) => item.order ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, languages, frameworks, hosting, databases, erps, crms, ecommerces]);

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">
              Novo {tabs.find(t => t.key === activeTab)?.label.slice(0, -1)}
            </h2>
            <TechProfileGenericForm type={activeTab} usedOrders={usedOrders} />
          </div>
        </div>
        <div className="lg:col-span-2">
          <TechProfileGenericList type={activeTab} />
        </div>
      </div>
    </div>
  );
}
