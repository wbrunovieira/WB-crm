import type { Contact } from '@prisma/client';

export const mockContact: Contact = {
  id: 'contact-test-1',
  name: 'João Silva',
  email: 'joao@example.com',
  phone: '+5511999999999',
  whatsapp: '+5511999999999',
  role: 'CEO',
  department: 'Diretoria',
  leadId: null,
  organizationId: 'org-test-1',
  partnerId: null,
  linkedin: 'in/joaosilva',
  status: 'active',
  isPrimary: true,
  birthDate: new Date('1980-05-15'),
  notes: 'Contato principal da empresa',
  preferredLanguage: 'pt-BR',
  source: 'website',
  sourceLeadContactId: null,
  ownerId: 'user-test-123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockContactFromLeadContact: Contact = {
  ...mockContact,
  id: 'contact-from-lead-1',
  sourceLeadContactId: 'lead-contact-1',
  organizationId: 'org-from-lead-1',
};

export const mockContactLinkedToLead: Contact = {
  ...mockContact,
  id: 'contact-lead-1',
  leadId: 'lead-test-1',
  organizationId: null,
};

export const mockContactLinkedToPartner: Contact = {
  ...mockContact,
  id: 'contact-partner-1',
  partnerId: 'partner-test-1',
  organizationId: null,
  leadId: null,
};

export const mockInactiveContact: Contact = {
  ...mockContact,
  id: 'contact-inactive-1',
  status: 'inactive',
};
