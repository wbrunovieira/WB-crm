"use client";

import { useState, useEffect } from "react";
import { getOrganizationTechProfile } from "@/actions/organization-tech-profile";
import { Database, Plus } from "lucide-react";
import { AddTechProfileModal } from "../leads/AddTechProfileModal";
import { TechProfileBadge } from "../shared/TechProfileBadge";

interface OrganizationTechProfileSectionProps {
  organizationId: string;
}

export function OrganizationTechProfileSection({ organizationId }: OrganizationTechProfileSectionProps) {
  const [techProfile, setTechProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadTechProfile();
  }, [organizationId]);

  const loadTechProfile = async () => {
    try {
      const data = await getOrganizationTechProfile(organizationId);
      setTechProfile(data);
    } catch (error) {
      console.error("Erro ao carregar tech profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasAnyTech = techProfile && (
    techProfile.languages.length > 0 ||
    techProfile.frameworks.length > 0 ||
    techProfile.hosting.length > 0 ||
    techProfile.databases.length > 0 ||
    techProfile.erps.length > 0 ||
    techProfile.crms.length > 0 ||
    techProfile.ecommerces.length > 0
  );

  if (loading) {
    return (
      <div className="mt-6 rounded-xl bg-white p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-gray-500" />
            <h2 className="text-xl font-bold text-gray-900">Perfil Tecnológico</h2>
          </div>
        </div>
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 rounded-xl bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
        <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔧</span>
            <h2 className="text-xl font-bold text-gray-900">Perfil Tecnológico</h2>
            <span className="text-sm text-gray-500">(Stack Atual do Organization)</span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>

        {!hasAnyTech ? (
          <p className="text-sm text-gray-500">
            Nenhuma informação tecnológica cadastrada para este organization.
          </p>
        ) : (
          <div className="space-y-4">
            {techProfile.languages.length > 0 && (
              <TechProfileBadge
                title="Linguagens"
                items={techProfile.languages.map((l: any) => l.language)}
                entityId={organizationId}
                entityType="organization"
                profileType="languages"
                onUpdate={loadTechProfile}
              />
            )}

            {techProfile.frameworks.length > 0 && (
              <TechProfileBadge
                title="Frameworks"
                items={techProfile.frameworks.map((f: any) => f.framework)}
                entityId={organizationId}
                entityType="organization"
                profileType="frameworks"
                onUpdate={loadTechProfile}
              />
            )}

            {techProfile.hosting.length > 0 && (
              <TechProfileBadge
                title="Hospedagem"
                items={techProfile.hosting.map((h: any) => h.hosting)}
                entityId={organizationId}
                entityType="organization"
                profileType="hosting"
                onUpdate={loadTechProfile}
              />
            )}

            {techProfile.databases.length > 0 && (
              <TechProfileBadge
                title="Bancos de Dados"
                items={techProfile.databases.map((d: any) => d.database)}
                entityId={organizationId}
                entityType="organization"
                profileType="databases"
                onUpdate={loadTechProfile}
              />
            )}

            {techProfile.erps.length > 0 && (
              <TechProfileBadge
                title="ERPs"
                items={techProfile.erps.map((e: any) => e.erp)}
                entityId={organizationId}
                entityType="organization"
                profileType="erps"
                onUpdate={loadTechProfile}
              />
            )}

            {techProfile.crms.length > 0 && (
              <TechProfileBadge
                title="CRMs"
                items={techProfile.crms.map((c: any) => c.crm)}
                entityId={organizationId}
                entityType="organization"
                profileType="crms"
                onUpdate={loadTechProfile}
              />
            )}

            {techProfile.ecommerces.length > 0 && (
              <TechProfileBadge
                title="E-commerce"
                items={techProfile.ecommerces.map((e: any) => e.ecommerce)}
                entityId={organizationId}
                entityType="organization"
                profileType="ecommerces"
                onUpdate={loadTechProfile}
              />
            )}
          </div>
        )}
      </div>

      <AddTechProfileModal
        entityId={organizationId}
        entityType="organization"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadTechProfile}
      />
    </>
  );
}
