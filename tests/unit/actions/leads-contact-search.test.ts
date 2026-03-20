import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prismaMock } from '../../setup';
import { mockSession } from '../../fixtures/users';

const mockedGetServerSession = vi.mocked(getServerSession);

import { getLeads } from '@/actions/leads';

describe('getLeads - contact search filter', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(mockSession);
  });

  it('should search by lead email, contact email, and contact name', async () => {
    prismaMock.lead.findMany.mockResolvedValue([]);

    await getLeads({ contactSearch: 'joao' });

    expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { email: { contains: 'joao', mode: 'insensitive' } },
            { leadContacts: { some: { email: { contains: 'joao', mode: 'insensitive' } } } },
            { leadContacts: { some: { name: { contains: 'joao', mode: 'insensitive' } } } },
          ],
        }),
      })
    );
  });

  it('should not add contact filter when contactSearch is empty', async () => {
    prismaMock.lead.findMany.mockResolvedValue([]);

    await getLeads({ contactSearch: '' });

    const call = prismaMock.lead.findMany.mock.calls[0][0];
    expect(call?.where?.OR).toBeUndefined();
  });

  it('should combine with regular search using AND', async () => {
    prismaMock.lead.findMany.mockResolvedValue([]);

    await getLeads({ search: 'Tech Corp', contactSearch: 'maria@tech.com' });

    const call = prismaMock.lead.findMany.mock.calls[0][0];
    expect(call?.where?.AND).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          OR: expect.arrayContaining([
            { businessName: expect.objectContaining({ contains: 'Tech Corp' }) },
          ]),
        }),
        expect.objectContaining({
          OR: [
            { email: { contains: 'maria@tech.com', mode: 'insensitive' } },
            { leadContacts: { some: { email: { contains: 'maria@tech.com', mode: 'insensitive' } } } },
            { leadContacts: { some: { name: { contains: 'maria@tech.com', mode: 'insensitive' } } } },
          ],
        }),
      ])
    );
  });

  it('should return leads matching contact name', async () => {
    const leadWithContact = {
      id: 'lead-1',
      businessName: 'Empresa X',
      email: null,
      leadContacts: [
        { id: 'lc-1', email: null, name: 'Maria Santos', isActive: true },
      ],
      owner: { id: 'user-test-123', name: 'Test User' },
      icps: [],
      _count: { leadContacts: 1, leadCadences: 0 },
    };

    prismaMock.lead.findMany.mockResolvedValue([leadWithContact] as never);

    const result = await getLeads({ contactSearch: 'Maria' });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('lead-1');
  });
});
