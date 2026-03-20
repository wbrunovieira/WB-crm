import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prismaMock } from '../../setup';
import { mockSession } from '../../fixtures/users';

const mockedGetServerSession = vi.mocked(getServerSession);

import { toggleLeadContactActive } from '@/actions/leads';
import { toggleContactStatus } from '@/actions/contacts';

describe('toggleLeadContactActive', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(mockSession);
  });

  it('should deactivate an active lead contact', async () => {
    const leadContact = {
      id: 'lc-1',
      leadId: 'lead-1',
      name: 'João Silva',
      role: 'CTO',
      email: 'joao@test.com',
      phone: null,
      whatsapp: null,
      linkedin: null,
      instagram: null,
      isPrimary: false,
      isActive: true,
      convertedToContactId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lead: { id: 'lead-1', ownerId: 'user-test-123' },
    };

    prismaMock.leadContact.findUnique.mockResolvedValue(leadContact as never);
    prismaMock.leadContact.update.mockResolvedValue({ ...leadContact, isActive: false } as never);

    const result = await toggleLeadContactActive('lc-1');

    expect(prismaMock.leadContact.update).toHaveBeenCalledWith({
      where: { id: 'lc-1' },
      data: { isActive: false },
    });
    expect(result.isActive).toBe(false);
  });

  it('should activate an inactive lead contact', async () => {
    const leadContact = {
      id: 'lc-1',
      leadId: 'lead-1',
      name: 'João Silva',
      role: 'CTO',
      email: 'joao@test.com',
      phone: null,
      whatsapp: null,
      linkedin: null,
      instagram: null,
      isPrimary: false,
      isActive: false,
      convertedToContactId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lead: { id: 'lead-1', ownerId: 'user-test-123' },
    };

    prismaMock.leadContact.findUnique.mockResolvedValue(leadContact as never);
    prismaMock.leadContact.update.mockResolvedValue({ ...leadContact, isActive: true } as never);

    const result = await toggleLeadContactActive('lc-1');

    expect(prismaMock.leadContact.update).toHaveBeenCalledWith({
      where: { id: 'lc-1' },
      data: { isActive: true },
    });
    expect(result.isActive).toBe(true);
  });

  it('should throw error if lead contact not found', async () => {
    prismaMock.leadContact.findUnique.mockResolvedValue(null);

    await expect(toggleLeadContactActive('invalid')).rejects.toThrow('Contato não encontrado');
  });

  it('should throw error if user does not own the lead', async () => {
    const leadContact = {
      id: 'lc-1',
      leadId: 'lead-1',
      name: 'João Silva',
      role: null,
      email: null,
      phone: null,
      whatsapp: null,
      linkedin: null,
      instagram: null,
      isPrimary: false,
      isActive: true,
      convertedToContactId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lead: { id: 'lead-1', ownerId: 'other-user-456' },
    };

    prismaMock.leadContact.findUnique.mockResolvedValue(leadContact as never);

    await expect(toggleLeadContactActive('lc-1')).rejects.toThrow('Contato não encontrado');
  });
});

describe('toggleContactStatus', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(mockSession);
  });

  it('should deactivate an active contact', async () => {
    const contact = {
      id: 'c-1',
      name: 'Maria Santos',
      email: 'maria@test.com',
      phone: null,
      whatsapp: null,
      role: null,
      department: null,
      leadId: null,
      organizationId: 'org-1',
      partnerId: null,
      linkedin: null,
      instagram: null,
      status: 'active',
      isPrimary: false,
      birthDate: null,
      notes: null,
      preferredLanguage: 'pt-BR',
      source: null,
      sourceLeadContactId: null,
      ownerId: 'user-test-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.contact.findUnique.mockResolvedValue(contact as never);
    prismaMock.contact.update.mockResolvedValue({ ...contact, status: 'inactive' } as never);

    const result = await toggleContactStatus('c-1');

    expect(prismaMock.contact.update).toHaveBeenCalledWith({
      where: { id: 'c-1' },
      data: { status: 'inactive' },
    });
    expect(result.status).toBe('inactive');
  });

  it('should activate an inactive contact', async () => {
    const contact = {
      id: 'c-1',
      name: 'Maria Santos',
      email: 'maria@test.com',
      phone: null,
      whatsapp: null,
      role: null,
      department: null,
      leadId: null,
      organizationId: 'org-1',
      partnerId: null,
      linkedin: null,
      instagram: null,
      status: 'inactive',
      isPrimary: false,
      birthDate: null,
      notes: null,
      preferredLanguage: 'pt-BR',
      source: null,
      sourceLeadContactId: null,
      ownerId: 'user-test-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.contact.findUnique.mockResolvedValue(contact as never);
    prismaMock.contact.update.mockResolvedValue({ ...contact, status: 'active' } as never);

    const result = await toggleContactStatus('c-1');

    expect(prismaMock.contact.update).toHaveBeenCalledWith({
      where: { id: 'c-1' },
      data: { status: 'active' },
    });
    expect(result.status).toBe('active');
  });

  it('should throw error if contact not found', async () => {
    prismaMock.contact.findUnique.mockResolvedValue(null);

    await expect(toggleContactStatus('invalid')).rejects.toThrow('Contato não encontrado');
  });

  it('should throw error if user does not own the contact', async () => {
    const contact = {
      id: 'c-1',
      name: 'Maria Santos',
      email: null,
      phone: null,
      whatsapp: null,
      role: null,
      department: null,
      leadId: null,
      organizationId: null,
      partnerId: null,
      linkedin: null,
      instagram: null,
      status: 'active',
      isPrimary: false,
      birthDate: null,
      notes: null,
      preferredLanguage: 'pt-BR',
      source: null,
      sourceLeadContactId: null,
      ownerId: 'other-user-456',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.contact.findUnique.mockResolvedValue(contact as never);

    await expect(toggleContactStatus('c-1')).rejects.toThrow('Contato não encontrado');
  });
});
