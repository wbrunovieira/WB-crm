import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prismaMock } from '../../setup';
import { mockSession } from '../../fixtures/users';

const mockedGetServerSession = vi.mocked(getServerSession);

import { toggleLeadContactActive } from '@/actions/leads';

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

