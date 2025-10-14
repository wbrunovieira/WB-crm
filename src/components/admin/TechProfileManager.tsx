"use client";

import { useState } from "react";
import { TechProfileGenericForm } from "./TechProfileGenericForm";
import { TechProfileGenericList } from "./TechProfileGenericList";

type TechProfileItem = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  order: number;
  isActive: boolean;
  _count: {
    leadLanguages?: number;
    organizationLanguages?: number;
    leadFrameworks?: number;
    organizationFrameworks?: number;
    leadHosting?: number;
    organizationHosting?: number;
    leadDatabases?: number;
    organizationDatabases?: number;
    leadERPs?: number;
    organizationERPs?: number;
    leadCRMs?: number;
    organizationCRMs?: number;
    leadEcommerces?: number;
    organizationEcommerces?: number;
  };
};

type TechProfileHosting = TechProfileItem & { type: string };
type TechProfileDatabase = TechProfileItem & { type: string };

interface TechProfileManagerProps {
  languages: TechProfileItem[];
  frameworks: TechProfileItem[];
  hosting: TechProfileHosting[];
  databases: TechProfileDatabase[];
  erps: TechProfileItem[];
  crms: TechProfileItem[];
  ecommerces: TechProfileItem[];
}

type Tab = "languages" | "frameworks" | "hosting" | "databases" | "erps" | "crms" | "ecommerces";

export function TechProfileManager({
  languages,
  frameworks,
  hosting,
  databases,
  erps,
  crms,
  ecommerces,
}: TechProfileManagerProps) {
  const [activeTab, setActiveTab] = useState<Tab>("languages");

  const tabs = [
    { key: "languages" as Tab, label: "Linguagens", count: languages.length },
    { key: "frameworks" as Tab, label: "Frameworks", count: frameworks.length },
    { key: "hosting" as Tab, label: "Hospedagem", count: hosting.length },
    { key: "databases" as Tab, label: "Bancos de Dados", count: databases.length },
    { key: "erps" as Tab, label: "ERPs", count: erps.length },
    { key: "crms" as Tab, label: "CRMs", count: crms.length },
    { key: "ecommerces" as Tab, label: "E-commerce", count: ecommerces.length },
  ];

  const getActiveData = () => {
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

  const getCountKey = () => {
    switch (activeTab) {
      case "languages": return { lead: "leadLanguages", org: "organizationLanguages" };
      case "frameworks": return { lead: "leadFrameworks", org: "organizationFrameworks" };
      case "hosting": return { lead: "leadHosting", org: "organizationHosting" };
      case "databases": return { lead: "leadDatabases", org: "organizationDatabases" };
      case "erps": return { lead: "leadERPs", org: "organizationERPs" };
      case "crms": return { lead: "leadCRMs", org: "organizationCRMs" };
      case "ecommerces": return { lead: "leadEcommerces", org: "organizationEcommerces" };
    }
  };

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
            <TechProfileGenericForm type={activeTab} />
          </div>
        </div>
        <div className="lg:col-span-2">
          <TechProfileGenericList
            type={activeTab}
            items={getActiveData()}
            countKeys={getCountKey()}
          />
        </div>
      </div>
    </div>
  );
}
