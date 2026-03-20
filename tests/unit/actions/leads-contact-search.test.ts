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

  it('should use raw query to find lead IDs matching contact name/email with unaccent', async () => {
    // Raw query returns matching lead IDs
    prismaMock.$queryRaw.mockResolvedValue([
      { leadId: 'lead-1' },
      { leadId: 'lead-2' },
    ]);
    prismaMock.lead.findMany.mockResolvedValue([]);

    await getLeads({ contactSearch: 'Paulo Zetola' });

    // Should have called $queryRaw for unaccent search
    expect(prismaMock.$queryRaw).toHaveBeenCalled();

    // Should filter leads by the IDs found
    expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { id: { in: ['lead-1', 'lead-2'] } },
            { email: { contains: 'Paulo Zetola', mode: 'insensitive' } },
          ],
        }),
      })
    );
  });

  it('should not add contact filter when contactSearch is empty', async () => {
    prismaMock.lead.findMany.mockResolvedValue([]);

    await getLeads({ contactSearch: '' });

    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    const call = prismaMock.lead.findMany.mock.calls[0][0];
    expect(call?.where?.OR).toBeUndefined();
  });

  it('should handle no matching contacts gracefully', async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);
    prismaMock.lead.findMany.mockResolvedValue([]);

    await getLeads({ contactSearch: 'nonexistent@email.com' });

    expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { id: { in: [] } },
            { email: { contains: 'nonexistent@email.com', mode: 'insensitive' } },
          ],
        }),
      })
    );
  });

  it('should combine with regular search using AND', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ leadId: 'lead-1' }]);
    prismaMock.lead.findMany.mockResolvedValue([]);

    await getLeads({ search: 'Tech Corp', contactSearch: 'maria' });

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
            { id: { in: ['lead-1'] } },
            { email: { contains: 'maria', mode: 'insensitive' } },
          ],
        }),
      ])
    );
  });
});
