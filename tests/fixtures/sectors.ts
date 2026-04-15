/**
 * Sector test fixtures
 */

import { userA } from './multiple-users';

export const mockSector = {
  id: 'sector-test-1',
  name: 'Clínicas Médicas',
  slug: 'clinicas-medicas',
  description: 'Setor de clínicas médicas e consultórios de saúde',
  isActive: true,
  // Market
  marketSize: 'R$ 250 bilhões/ano no Brasil',
  marketSizeNotes: 'Crescimento de 8% ao ano. Alta fragmentação — maioria são clínicas independentes.',
  averageTicket: 'R$ 8k - 60k/ano',
  budgetSeason: 'Janeiro-Março e Agosto-Setembro',
  // Sales cycle
  salesCycleDays: 45,
  salesCycleNotes: 'Depende do porte. Clínicas pequenas decidem em 2 semanas. Redes levam 60-90 dias.',
  // Buyer profile
  decisionMakers: 'Dono da clínica (médico-gestor), sócio administrador, gerente administrativo',
  buyingProcess: 'Pesquisa online → indicação → demo → proposta → aprovação com sócio → contrato',
  mainObjections: 'Sem tempo para implantação, já tem sistema, preço alto, LGPD/CFM compliance',
  // Market knowledge
  mainPains: 'Gestão de agendamentos, fila de espera, controle financeiro, prontuário eletrônico, inadimplência',
  referenceCompanies: 'Unimed, Dasa, Hapvida, Einstein, Sírio-Libanês (redes); iClinic, MedPlus (software)',
  competitorsLandscape: 'iClinic, Doctoralia, MedPlus, Pixeon, HiDoctor',
  jargons: 'PEP (Prontuário Eletrônico do Paciente), CFM, CRM (médico), TUSS, CBHPM, convênio, glosa, SADT',
  regulatoryNotes: 'CFM regula softwares de PEP. Resolução CFM 1821/2007. LGPD especialmente sensível (dados de saúde = dados sensíveis).',
  ownerId: userA.id,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockSectorInactive = {
  ...mockSector,
  id: 'sector-test-2',
  name: 'Delivery de Comida',
  slug: 'delivery-de-comida',
  description: null,
  isActive: false,
  marketSize: null,
  marketSizeNotes: null,
  averageTicket: null,
  budgetSeason: null,
  salesCycleDays: null,
  salesCycleNotes: null,
  decisionMakers: null,
  buyingProcess: null,
  mainObjections: null,
  mainPains: null,
  referenceCompanies: 'iFood, Rappi, Uber Eats',
  competitorsLandscape: null,
  jargons: null,
  regulatoryNotes: null,
};

export const mockLeadSector = {
  id: 'lead-sector-1',
  leadId: 'lead-test-1',
  sectorId: 'sector-test-1',
  createdAt: new Date('2024-01-01'),
};

export const mockOrganizationSector = {
  id: 'org-sector-1',
  organizationId: 'org-test-1',
  sectorId: 'sector-test-1',
  createdAt: new Date('2024-01-01'),
};
