import type { Partner } from '@prisma/client';

export const mockPartner: Partner = {
  id: 'partner-test-1',
  name: 'Partner Consulting',
  legalName: 'Partner Consulting LTDA',
  foundationDate: new Date('2018-03-10'),
  partnerType: 'consultoria',
  website: 'https://partnerconsulting.com',
  email: 'contact@partnerconsulting.com',
  phone: '+5511888888888',
  whatsapp: '+5511888888888',
  country: 'Brasil',
  state: 'SP',
  city: 'São Paulo',
  zipCode: '04567-890',
  streetAddress: 'Av. Partner, 456',
  linkedin: 'company/partnerconsulting',
  instagram: '@partnerconsulting',
  facebook: 'partnerconsulting',
  twitter: '@partnerconsult',
  industry: 'Consultoria em TI',
  employeeCount: 25,
  companySize: 'Pequeno Porte',
  description: 'Consultoria especializada em transformação digital',
  expertise: 'Cloud Computing, DevOps',
  notes: 'Parceiro estratégico para projetos de infraestrutura',
  lastContactDate: new Date('2024-03-15'),
  ownerId: 'user-test-123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockUniversityPartner: Partner = {
  ...mockPartner,
  id: 'partner-university-1',
  name: 'Universidade Tech',
  partnerType: 'universidade',
  expertise: 'Pesquisa em IA, Machine Learning',
};

export const mockSupplierPartner: Partner = {
  ...mockPartner,
  id: 'partner-supplier-1',
  name: 'Tech Supplier Co',
  partnerType: 'fornecedor',
  expertise: 'Hardware, Servidores',
};

export const mockReferrerPartner: Partner = {
  ...mockPartner,
  id: 'partner-referrer-1',
  name: 'Indicador Network',
  partnerType: 'indicador',
  expertise: 'Networking B2B',
};

export const mockInvestorPartner: Partner = {
  ...mockPartner,
  id: 'partner-investor-1',
  name: 'Venture Capital Tech',
  partnerType: 'investidor',
  expertise: 'Investimentos em Startups',
};
