import type { Organization } from '@prisma/client';

export const mockOrganization: Organization = {
  id: 'org-test-1',
  name: 'Test Organization',
  legalName: 'Test Organization LTDA',
  foundationDate: new Date('2020-01-15'),
  website: 'https://testorg.com',
  phone: '+5511999999999',
  whatsapp: '+5511999999999',
  email: 'contact@testorg.com',
  country: 'Brasil',
  state: 'SP',
  city: 'São Paulo',
  zipCode: '01234-567',
  streetAddress: 'Rua Test, 123',
  industry: 'Tecnologia',
  employeeCount: 50,
  annualRevenue: 5000000,
  taxId: '12.345.678/0001-90',
  description: 'Organização de tecnologia',
  companyOwner: 'João Silva',
  companySize: 'Médio Porte',
  primaryCNAEId: 'cnae-123',
  internationalActivity: null,
  instagram: '@testorg',
  linkedin: 'company/testorg',
  facebook: 'testorg',
  twitter: '@testorg',
  tiktok: null,
  sourceLeadId: null,
  labelId: null,
  externalProjectIds: null,
  ownerId: 'user-test-123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockOrganizationFromLead: Organization = {
  ...mockOrganization,
  id: 'org-from-lead-1',
  sourceLeadId: 'lead-test-1',
  name: 'Test Company LTDA',
};

export const mockOrganizationWithProjects: Organization = {
  ...mockOrganization,
  id: 'org-with-projects-1',
  externalProjectIds: JSON.stringify(['project-123', 'project-456']),
};
