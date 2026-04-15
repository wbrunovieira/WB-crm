/**
 * Sector Action Tests — TDD
 *
 * Tests for src/actions/sectors.ts
 * RULE: Fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { prismaMock } from '../../setup';
import { sessionUserA, sessionAdmin, userA, adminUser } from '../../fixtures/multiple-users';
import { mockSector, mockSectorInactive } from '../../fixtures/sectors';

import {
  createSector,
  getSectors,
  getSectorsForSelect,
  getSectorById,
  updateSector,
  deleteSector,
} from '@/actions/sectors';

const mockedGetServerSession = vi.mocked(getServerSession);

describe('Sector Actions', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(sessionUserA);
    prismaMock.sharedEntity.findMany.mockResolvedValue([]);
    prismaMock.sharedEntity.findFirst.mockResolvedValue(null);
  });

  // ==========================================
  // createSector
  // ==========================================
  describe('createSector', () => {
    const validData = {
      name: 'Clínicas Médicas',
      slug: 'clinicas-medicas',
      description: 'Setor de saúde',
      isActive: true,
      marketSize: 'R$ 250 bilhões',
      marketSizeNotes: null,
      averageTicket: null,
      budgetSeason: null,
      salesCycleDays: null,
      salesCycleNotes: null,
      decisionMakers: null,
      buyingProcess: null,
      mainObjections: null,
      mainPains: null,
      referenceCompanies: null,
      competitorsLandscape: null,
      jargons: null,
      regulatoryNotes: null,
    };

    it('should create a sector and set ownerId from session', async () => {
      prismaMock.sector.create.mockResolvedValue({ ...mockSector, ownerId: userA.id });

      await createSector(validData);

      expect(prismaMock.sector.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Clínicas Médicas',
          slug: 'clinicas-medicas',
          ownerId: userA.id,
        }),
      });
    });

    it('should return the created sector', async () => {
      prismaMock.sector.create.mockResolvedValue({ ...mockSector, ownerId: userA.id });

      const result = await createSector(validData);

      expect(result.name).toBe(mockSector.name);
    });

    it('should call revalidatePath after creating', async () => {
      prismaMock.sector.create.mockResolvedValue({ ...mockSector, ownerId: userA.id });

      await createSector(validData);

      expect(revalidatePath).toHaveBeenCalledWith('/admin/sectors');
    });

    it('should throw if name is empty', async () => {
      await expect(createSector({ ...validData, name: '' })).rejects.toThrow();
    });

    it('should throw if slug is empty', async () => {
      await expect(createSector({ ...validData, slug: '' })).rejects.toThrow();
    });

    it('should throw if not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);
      await expect(createSector(validData)).rejects.toThrow('Não autorizado');
    });
  });

  // ==========================================
  // getSectors
  // ==========================================
  describe('getSectors', () => {
    it('should return sectors for current user', async () => {
      prismaMock.sector.findMany.mockResolvedValue([mockSector]);

      const result = await getSectors();

      expect(prismaMock.sector.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ownerId: userA.id }),
        })
      );
      expect(result).toHaveLength(1);
    });

    it('should return all sectors for admin', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);
      prismaMock.sector.findMany.mockResolvedValue([mockSector, mockSectorInactive]);

      await getSectors();

      const call = prismaMock.sector.findMany.mock.calls[0][0];
      expect(call?.where).not.toHaveProperty('ownerId');
    });

    it('should filter by isActive=true when filter passed', async () => {
      prismaMock.sector.findMany.mockResolvedValue([mockSector]);

      await getSectors({ isActive: true });

      expect(prismaMock.sector.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        })
      );
    });

    it('should filter by search term', async () => {
      prismaMock.sector.findMany.mockResolvedValue([mockSector]);

      await getSectors({ search: 'clinica' });

      expect(prismaMock.sector.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.objectContaining({ contains: 'clinica' }),
          }),
        })
      );
    });

    it('should throw if not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);
      await expect(getSectors()).rejects.toThrow('Não autorizado');
    });
  });

  // ==========================================
  // getSectorsForSelect
  // ==========================================
  describe('getSectorsForSelect', () => {
    it('should return only id and name fields', async () => {
      prismaMock.sector.findMany.mockResolvedValue([
        { id: 'sector-1', name: 'Clínicas Médicas' } as typeof mockSector,
      ]);

      await getSectorsForSelect();

      expect(prismaMock.sector.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({ id: true, name: true }),
          where: expect.objectContaining({ isActive: true }),
        })
      );
    });
  });

  // ==========================================
  // getSectorById
  // ==========================================
  describe('getSectorById', () => {
    it('should return the sector by id', async () => {
      prismaMock.sector.findFirst.mockResolvedValue(mockSector);

      const result = await getSectorById(mockSector.id);

      expect(result).not.toBeNull();
      expect(result?.name).toBe(mockSector.name);
    });

    it('should include _count of leads and organizations', async () => {
      prismaMock.sector.findFirst.mockResolvedValue({
        ...mockSector,
        _count: { leads: 3, organizations: 1 },
      } as typeof mockSector & { _count: { leads: number; organizations: number } });

      await getSectorById(mockSector.id);

      expect(prismaMock.sector.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            _count: expect.objectContaining({ select: expect.anything() }),
          }),
        })
      );
    });

    it('should return null if sector not found', async () => {
      prismaMock.sector.findFirst.mockResolvedValue(null);

      const result = await getSectorById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  // ==========================================
  // updateSector
  // ==========================================
  describe('updateSector', () => {
    it('should update sector fields', async () => {
      prismaMock.sector.findFirst.mockResolvedValue(mockSector);
      prismaMock.sector.update.mockResolvedValue({
        ...mockSector,
        marketSize: 'R$ 300 bilhões',
      });

      const result = await updateSector(mockSector.id, { marketSize: 'R$ 300 bilhões' });

      expect(prismaMock.sector.update).toHaveBeenCalledWith({
        where: { id: mockSector.id },
        data: expect.objectContaining({ marketSize: 'R$ 300 bilhões' }),
      });
      expect(result.marketSize).toBe('R$ 300 bilhões');
    });

    it('should throw if sector not found', async () => {
      prismaMock.sector.findFirst.mockResolvedValue(null);
      await expect(updateSector('nonexistent', {})).rejects.toThrow('Setor não encontrado');
    });

    it('should throw if user does not own the sector', async () => {
      prismaMock.sector.findFirst.mockResolvedValue({ ...mockSector, ownerId: 'other-user' });
      await expect(updateSector(mockSector.id, {})).rejects.toThrow('Sem permissão');
    });

    it('admin can update any sector', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);
      prismaMock.sector.findFirst.mockResolvedValue({ ...mockSector, ownerId: 'other-user' });
      prismaMock.sector.update.mockResolvedValue(mockSector);

      await updateSector(mockSector.id, { marketSize: 'novo' });

      expect(prismaMock.sector.update).toHaveBeenCalled();
    });

    it('should call revalidatePath after updating', async () => {
      prismaMock.sector.findFirst.mockResolvedValue(mockSector);
      prismaMock.sector.update.mockResolvedValue(mockSector);

      await updateSector(mockSector.id, {});

      expect(revalidatePath).toHaveBeenCalledWith('/admin/sectors');
      expect(revalidatePath).toHaveBeenCalledWith(`/admin/sectors/${mockSector.id}`);
    });

    it('should throw if not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);
      await expect(updateSector(mockSector.id, {})).rejects.toThrow('Não autorizado');
    });
  });

  // ==========================================
  // deleteSector
  // ==========================================
  describe('deleteSector', () => {
    it('should delete a sector with no leads/orgs linked', async () => {
      prismaMock.sector.findFirst.mockResolvedValue(mockSector);
      prismaMock.leadSector.count.mockResolvedValue(0);
      prismaMock.organizationSector.count.mockResolvedValue(0);
      prismaMock.sector.delete.mockResolvedValue(mockSector);

      await deleteSector(mockSector.id);

      expect(prismaMock.sector.delete).toHaveBeenCalledWith({ where: { id: mockSector.id } });
    });

    it('should throw if sector has linked leads', async () => {
      prismaMock.sector.findFirst.mockResolvedValue(mockSector);
      prismaMock.leadSector.count.mockResolvedValue(3);
      prismaMock.organizationSector.count.mockResolvedValue(0);

      await expect(deleteSector(mockSector.id)).rejects.toThrow('Setor possui leads vinculados');
    });

    it('should throw if sector has linked organizations', async () => {
      prismaMock.sector.findFirst.mockResolvedValue(mockSector);
      prismaMock.leadSector.count.mockResolvedValue(0);
      prismaMock.organizationSector.count.mockResolvedValue(2);

      await expect(deleteSector(mockSector.id)).rejects.toThrow('Setor possui organizações vinculadas');
    });

    it('should throw if sector not found', async () => {
      prismaMock.sector.findFirst.mockResolvedValue(null);
      await expect(deleteSector('nonexistent')).rejects.toThrow('Setor não encontrado');
    });

    it('should throw if user does not own the sector', async () => {
      prismaMock.sector.findFirst.mockResolvedValue({ ...mockSector, ownerId: 'other-user' });
      await expect(deleteSector(mockSector.id)).rejects.toThrow('Sem permissão');
    });

    it('should call revalidatePath after deleting', async () => {
      prismaMock.sector.findFirst.mockResolvedValue(mockSector);
      prismaMock.leadSector.count.mockResolvedValue(0);
      prismaMock.organizationSector.count.mockResolvedValue(0);
      prismaMock.sector.delete.mockResolvedValue(mockSector);

      await deleteSector(mockSector.id);

      expect(revalidatePath).toHaveBeenCalledWith('/admin/sectors');
    });

    it('should throw if not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);
      await expect(deleteSector(mockSector.id)).rejects.toThrow('Não autorizado');
    });
  });
});
