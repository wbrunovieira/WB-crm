import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prismaMock } from '../../setup';
import { mockSession } from '../../fixtures/users';

const mockedGetServerSession = vi.mocked(getServerSession);

import { getLeads } from '@/actions/leads';

describe('getLeads - email search filter', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(mockSession);
  });

  it('should search leads by lead email field when emailSearch is provided', async () => {
    prismaMock.lead.findMany.mockResolvedValue([]);

    await getLeads({ emailSearch: 'joao@empresa.com' });

    expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { email: { contains: 'joao@empresa.com', mode: 'insensitive' } },
            { leadContacts: { some: { email: { contains: 'joao@empresa.com', mode: 'insensitive' } } } },
          ],
        }),
      })
    );
  });

  it('should not add email OR filter when emailSearch is empty', async () => {
    prismaMock.lead.findMany.mockResolvedValue([]);

    await getLeads({ emailSearch: '' });

    const call = prismaMock.lead.findMany.mock.calls[0][0];
    // Should not have an OR with email search
    expect(call?.where?.OR).toBeUndefined();
  });

  it('should not interfere with regular search filter', async () => {
    prismaMock.lead.findMany.mockResolvedValue([]);

    await getLeads({ search: 'Tech Corp', emailSearch: 'test@tech.com' });

    const call = prismaMock.lead.findMany.mock.calls[0][0];
    // Should have AND combining both filters
    expect(call?.where?.AND).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          OR: expect.arrayContaining([
            { businessName: expect.objectContaining({ contains: 'Tech Corp' }) },
          ]),
        }),
        expect.objectContaining({
          OR: [
            { email: { contains: 'test@tech.com', mode: 'insensitive' } },
            { leadContacts: { some: { email: { contains: 'test@tech.com', mode: 'insensitive' } } } },
          ],
        }),
      ])
    );
  });

  it('should return leads that match email in leadContacts', async () => {
    const leadWithContactEmail = {
      id: 'lead-1',
      businessName: 'Empresa X',
      email: null,
      leadContacts: [
        { id: 'lc-1', email: 'contato@empresa.com', name: 'João', isActive: true },
      ],
      owner: { id: 'user-test-123', name: 'Test User' },
      icps: [],
      _count: { leadContacts: 1, leadCadences: 0 },
    };

    prismaMock.lead.findMany.mockResolvedValue([leadWithContactEmail] as never);

    const result = await getLeads({ emailSearch: 'contato@empresa.com' });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('lead-1');
  });
});
