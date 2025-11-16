import type { Activity } from '@prisma/client';

export const mockActivity: Activity = {
  id: 'activity-test-1',
  type: 'call',
  subject: 'Ligar para discutir proposta',
  description: 'Apresentar detalhes do projeto de e-commerce',
  dueDate: new Date('2024-12-31T14:00:00'),
  completed: false,
  dealId: 'deal-test-1',
  contactId: 'contact-test-1',
  contactIds: null,
  leadId: null,
  partnerId: null,
  ownerId: 'user-test-123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockActivityMeeting: Activity = {
  ...mockActivity,
  id: 'activity-meeting-1',
  type: 'meeting',
  subject: 'Reunião de alinhamento',
  dueDate: new Date('2024-12-15T10:00:00'),
};

export const mockActivityEmail: Activity = {
  ...mockActivity,
  id: 'activity-email-1',
  type: 'email',
  subject: 'Enviar proposta comercial',
};

export const mockActivityWhatsapp: Activity = {
  ...mockActivity,
  id: 'activity-whatsapp-1',
  type: 'whatsapp',
  subject: 'Mensagem de follow-up',
};

export const mockActivityCompleted: Activity = {
  ...mockActivity,
  id: 'activity-completed-1',
  completed: true,
  dueDate: new Date('2024-01-15T14:00:00'),
};

export const mockActivityLinkedToLead: Activity = {
  ...mockActivity,
  id: 'activity-lead-1',
  dealId: null,
  contactId: null,
  leadId: 'lead-test-1',
};

export const mockActivityLinkedToPartner: Activity = {
  ...mockActivity,
  id: 'activity-partner-1',
  dealId: null,
  contactId: null,
  partnerId: 'partner-test-1',
};

export const mockActivityMultipleContacts: Activity = {
  ...mockActivity,
  id: 'activity-multi-1',
  contactIds: JSON.stringify(['contact-test-1', 'contact-test-2']),
};
