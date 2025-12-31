/**
 * Tests for Partners Server Actions
 *
 * REGRA FUNDAMENTAL: Quando um teste falha, corrija a IMPLEMENTAÇÃO, nunca o teste.
 * Os testes definem o comportamento esperado do sistema.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';
import type { Session } from 'next-auth';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: mockDeep<PrismaClient>(),
}));

// Mock revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Variable to control session mock
let mockSession: Session | null = null;

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

// Import after mocks
import { prisma } from '@/lib/prisma';
import {
  createPartner,
  getPartners,
  getPartnerById,
  updatePartner,
  deletePartner,
  updatePartnerLastContact,
} from '@/actions/partners';
import {
  userA,
  userB,
  adminUser,
  sessionUserA,
  sessionUserB,
  sessionAdmin,
  createMockPartner,
} from '../fixtures/multiple-users';

const mockPrisma = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Partners Actions', () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    mockSession = null;
  });

  // ===========================================
  // createPartner Tests
  // ===========================================
  describe('createPartner', () => {
    const validPartnerData = {
      name: 'Tech Partner Inc',
      partnerType: 'consultoria',
      legalName: 'Tech Partner Inc LTDA',
      website: 'https://techpartner.com',
      email: 'contact@techpartner.com',
      phone: '+55 11 99999-0000',
      country: 'Brasil',
      state: 'SP',
      city: 'São Paulo',
      industry: 'Technology',
      expertise: 'Cloud Computing',
      description: 'Technology consulting partner',
    };

    it('should create a partner with valid data', async () => {
      mockSession = sessionUserA;
      const createdPartner = {
        id: 'partner-1',
        ...validPartnerData,
        ownerId: userA.id,
        lastContactDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.partner.create.mockResolvedValue(createdPartner as any);

      const result = await createPartner(validPartnerData);

      expect(result.id).toBe('partner-1');
      expect(result.name).toBe('Tech Partner Inc');
      expect(mockPrisma.partner.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Tech Partner Inc',
            partnerType: 'consultoria',
            ownerId: userA.id,
          }),
        })
      );
    });

    it('should throw error with invalid name (too short)', async () => {
      mockSession = sessionUserA;

      const invalidData = { ...validPartnerData, name: 'A' };

      await expect(createPartner(invalidData)).rejects.toThrow();
    });

    it('should throw error without partnerType', async () => {
      mockSession = sessionUserA;

      const invalidData = { ...validPartnerData, partnerType: '' };

      await expect(createPartner(invalidData)).rejects.toThrow();
    });

    it('should set ownerId to current user', async () => {
      mockSession = sessionUserA;
      mockPrisma.partner.create.mockResolvedValue({
        id: 'partner-1',
        ...validPartnerData,
        ownerId: userA.id,
        lastContactDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await createPartner(validPartnerData);

      expect(mockPrisma.partner.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });

    // Test all partner types
    it.each([
      'consultoria',
      'universidade',
      'fornecedor',
      'indicador',
      'investidor',
    ])('should create partner with type %s', async (partnerType) => {
      mockSession = sessionUserA;
      const dataWithType = { ...validPartnerData, partnerType };
      mockPrisma.partner.create.mockResolvedValue({
        id: 'partner-1',
        ...dataWithType,
        ownerId: userA.id,
        lastContactDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await createPartner(dataWithType);

      expect(mockPrisma.partner.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            partnerType,
          }),
        })
      );
    });

    it('should set lastContactDate to current date on creation', async () => {
      mockSession = sessionUserA;
      const now = new Date();
      mockPrisma.partner.create.mockResolvedValue({
        id: 'partner-1',
        ...validPartnerData,
        ownerId: userA.id,
        lastContactDate: now,
        createdAt: now,
        updatedAt: now,
      } as any);

      await createPartner(validPartnerData);

      expect(mockPrisma.partner.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lastContactDate: expect.any(Date),
          }),
        })
      );
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(createPartner(validPartnerData)).rejects.toThrow('Não autorizado');
    });

    // Triangulation: User B can create their own partner
    it('should allow User B to create their own partner', async () => {
      mockSession = sessionUserB;
      mockPrisma.partner.create.mockResolvedValue({
        id: 'partner-2',
        ...validPartnerData,
        ownerId: userB.id,
        lastContactDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await createPartner(validPartnerData);

      expect(mockPrisma.partner.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: userB.id,
          }),
        })
      );
    });
  });

  // ===========================================
  // getPartners Tests
  // ===========================================
  describe('getPartners', () => {
    it('should filter partners by owner for non-admin user', async () => {
      mockSession = sessionUserA;
      const userAPartners = [
        createMockPartner(userA.id, { id: 'partner-1', name: 'Partner 1' }),
        createMockPartner(userA.id, { id: 'partner-2', name: 'Partner 2' }),
      ];

      mockPrisma.partner.findMany.mockResolvedValue(userAPartners as any);

      await getPartners({});

      expect(mockPrisma.partner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });

    it('should return all partners for admin user', async () => {
      mockSession = sessionAdmin;
      const allPartners = [
        createMockPartner(userA.id, { id: 'partner-1' }),
        createMockPartner(userB.id, { id: 'partner-2' }),
      ];

      mockPrisma.partner.findMany.mockResolvedValue(allPartners as any);

      await getPartners({});

      // Admin should not have ownerId filter
      const call = mockPrisma.partner.findMany.mock.calls[0][0];
      expect(call?.where?.ownerId).toBeUndefined();
    });

    it('should filter by search term', async () => {
      mockSession = sessionUserA;
      mockPrisma.partner.findMany.mockResolvedValue([]);

      await getPartners({ search: 'Technology' });

      expect(mockPrisma.partner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: { contains: 'Technology' } }),
              expect.objectContaining({ partnerType: { contains: 'Technology' } }),
              expect.objectContaining({ expertise: { contains: 'Technology' } }),
            ]),
          }),
        })
      );
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(getPartners({})).rejects.toThrow('Não autorizado');
    });

    // Triangulation: User B sees only their partners
    it('should filter by User B ownerId when User B queries', async () => {
      mockSession = sessionUserB;
      mockPrisma.partner.findMany.mockResolvedValue([]);

      await getPartners({});

      expect(mockPrisma.partner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userB.id,
          }),
        })
      );
    });
  });

  // ===========================================
  // getPartnerById Tests
  // ===========================================
  describe('getPartnerById', () => {
    it('should return partner owned by current user', async () => {
      mockSession = sessionUserA;
      const partner = createMockPartner(userA.id, { id: 'partner-1', name: 'My Partner' });
      mockPrisma.partner.findFirst.mockResolvedValue(partner as any);

      const result = await getPartnerById('partner-1');

      expect(result?.id).toBe('partner-1');
      expect(result?.name).toBe('My Partner');
      expect(mockPrisma.partner.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'partner-1',
            ownerId: userA.id,
          }),
        })
      );
    });

    it('should return null when accessing partner owned by another user', async () => {
      mockSession = sessionUserA;
      // findFirst with ownerFilter returns null for records not owned by user
      mockPrisma.partner.findFirst.mockResolvedValue(null);

      const result = await getPartnerById('partner-2');

      expect(result).toBeNull();
    });

    it('should return null for non-existent partner', async () => {
      mockSession = sessionUserA;
      mockPrisma.partner.findFirst.mockResolvedValue(null);

      const result = await getPartnerById('non-existent');

      expect(result).toBeNull();
    });

    it('should allow admin to access any partner (no ownerId filter)', async () => {
      mockSession = sessionAdmin;
      const userAPartner = createMockPartner(userA.id, { id: 'partner-1', name: 'User A Partner' });
      mockPrisma.partner.findFirst.mockResolvedValue(userAPartner as any);

      const result = await getPartnerById('partner-1');

      expect(result?.id).toBe('partner-1');
      // Admin should not have ownerId filter
      const call = mockPrisma.partner.findFirst.mock.calls[0][0];
      expect(call?.where?.ownerId).toBeUndefined();
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(getPartnerById('partner-1')).rejects.toThrow('Não autorizado');
    });

    // Triangulation: User B can access their own partner
    it('should allow User B to access their own partner', async () => {
      mockSession = sessionUserB;
      const userBPartner = createMockPartner(userB.id, { id: 'partner-b', name: 'User B Partner' });
      mockPrisma.partner.findFirst.mockResolvedValue(userBPartner as any);

      const result = await getPartnerById('partner-b');

      expect(result?.id).toBe('partner-b');
    });

    // Triangulation: User B cannot access User A's partner - returns null
    it('should return null when User B tries to access User A partner', async () => {
      mockSession = sessionUserB;
      // findFirst with ownerFilter returns null for records not owned by user
      mockPrisma.partner.findFirst.mockResolvedValue(null);

      const result = await getPartnerById('partner-a');

      expect(result).toBeNull();
    });
  });

  // ===========================================
  // updatePartner Tests
  // ===========================================
  describe('updatePartner', () => {
    const updateData = {
      name: 'Updated Partner',
      partnerType: 'investidor',
      legalName: 'Updated Partner LTDA',
      website: 'https://updated.com',
      email: 'updated@partner.com',
      expertise: 'Investment',
    };

    it('should update partner owned by current user', async () => {
      mockSession = sessionUserA;
      const existingPartner = createMockPartner(userA.id, { id: 'partner-1', name: 'Old Name' });
      mockPrisma.partner.findUnique.mockResolvedValue(existingPartner as any);
      mockPrisma.partner.update.mockResolvedValue({
        ...existingPartner,
        ...updateData,
      } as any);

      const result = await updatePartner('partner-1', updateData);

      expect(result.name).toBe('Updated Partner');
      expect(mockPrisma.partner.update).toHaveBeenCalled();
    });

    it('should throw error when updating partner owned by another user', async () => {
      mockSession = sessionUserA;
      const otherUserPartner = createMockPartner(userB.id, { id: 'partner-2', name: 'Not Mine' });
      mockPrisma.partner.findUnique.mockResolvedValue(otherUserPartner as any);

      await expect(updatePartner('partner-2', updateData)).rejects.toThrow('Parceiro não encontrado');
    });

    it('should throw error for non-existent partner', async () => {
      mockSession = sessionUserA;
      mockPrisma.partner.findUnique.mockResolvedValue(null);

      await expect(updatePartner('non-existent', updateData)).rejects.toThrow('Parceiro não encontrado');
    });

    it('should allow admin to update any partner', async () => {
      mockSession = sessionAdmin;
      const userAPartner = createMockPartner(userA.id, { id: 'partner-1', name: 'User A Partner' });
      mockPrisma.partner.findUnique.mockResolvedValue(userAPartner as any);
      mockPrisma.partner.update.mockResolvedValue({
        ...userAPartner,
        ...updateData,
      } as any);

      const result = await updatePartner('partner-1', updateData);

      expect(result.name).toBe('Updated Partner');
    });

    it('should throw validation error with invalid data', async () => {
      mockSession = sessionUserA;
      const existingPartner = createMockPartner(userA.id, { id: 'partner-1' });
      mockPrisma.partner.findUnique.mockResolvedValue(existingPartner as any);

      const invalidData = { ...updateData, name: 'A' }; // Too short

      await expect(updatePartner('partner-1', invalidData)).rejects.toThrow();
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(updatePartner('partner-1', updateData)).rejects.toThrow('Não autorizado');
    });

    // Triangulation: User B can update their own partner
    it('should allow User B to update their own partner', async () => {
      mockSession = sessionUserB;
      const userBPartner = createMockPartner(userB.id, { id: 'partner-b' });
      mockPrisma.partner.findUnique.mockResolvedValue(userBPartner as any);
      mockPrisma.partner.update.mockResolvedValue({
        ...userBPartner,
        ...updateData,
      } as any);

      const result = await updatePartner('partner-b', updateData);

      expect(result.name).toBe('Updated Partner');
    });
  });

  // ===========================================
  // updatePartnerLastContact Tests
  // ===========================================
  describe('updatePartnerLastContact', () => {
    it('should update lastContactDate for owned partner', async () => {
      mockSession = sessionUserA;
      const existingPartner = createMockPartner(userA.id, { id: 'partner-1' });
      const newDate = new Date();
      mockPrisma.partner.findUnique.mockResolvedValue(existingPartner as any);
      mockPrisma.partner.update.mockResolvedValue({
        ...existingPartner,
        lastContactDate: newDate,
      } as any);

      const result = await updatePartnerLastContact('partner-1');

      expect(result.lastContactDate).toEqual(newDate);
      expect(mockPrisma.partner.update).toHaveBeenCalledWith({
        where: { id: 'partner-1' },
        data: { lastContactDate: expect.any(Date) },
      });
    });

    it('should throw error when updating lastContact of partner owned by another user', async () => {
      mockSession = sessionUserA;
      const otherUserPartner = createMockPartner(userB.id, { id: 'partner-2' });
      mockPrisma.partner.findUnique.mockResolvedValue(otherUserPartner as any);

      await expect(updatePartnerLastContact('partner-2')).rejects.toThrow('Parceiro não encontrado');
    });

    it('should throw error for non-existent partner', async () => {
      mockSession = sessionUserA;
      mockPrisma.partner.findUnique.mockResolvedValue(null);

      await expect(updatePartnerLastContact('non-existent')).rejects.toThrow('Parceiro não encontrado');
    });

    it('should allow admin to update lastContact of any partner', async () => {
      mockSession = sessionAdmin;
      const userAPartner = createMockPartner(userA.id, { id: 'partner-1' });
      const newDate = new Date();
      mockPrisma.partner.findUnique.mockResolvedValue(userAPartner as any);
      mockPrisma.partner.update.mockResolvedValue({
        ...userAPartner,
        lastContactDate: newDate,
      } as any);

      const result = await updatePartnerLastContact('partner-1');

      expect(result.lastContactDate).toEqual(newDate);
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(updatePartnerLastContact('partner-1')).rejects.toThrow('Não autorizado');
    });

    // Triangulation: User B can update lastContact of their own partner
    it('should allow User B to update lastContact of their own partner', async () => {
      mockSession = sessionUserB;
      const userBPartner = createMockPartner(userB.id, { id: 'partner-b' });
      const newDate = new Date();
      mockPrisma.partner.findUnique.mockResolvedValue(userBPartner as any);
      mockPrisma.partner.update.mockResolvedValue({
        ...userBPartner,
        lastContactDate: newDate,
      } as any);

      const result = await updatePartnerLastContact('partner-b');

      expect(result.lastContactDate).toEqual(newDate);
    });

    // Triangulation: User B cannot update lastContact of User A's partner
    it('should block User B from updating lastContact of User A partner', async () => {
      mockSession = sessionUserB;
      const userAPartner = createMockPartner(userA.id, { id: 'partner-a' });
      mockPrisma.partner.findUnique.mockResolvedValue(userAPartner as any);

      await expect(updatePartnerLastContact('partner-a')).rejects.toThrow('Parceiro não encontrado');
    });
  });

  // ===========================================
  // deletePartner Tests
  // ===========================================
  describe('deletePartner', () => {
    it('should delete partner owned by current user', async () => {
      mockSession = sessionUserA;
      const existingPartner = createMockPartner(userA.id, { id: 'partner-1' });
      mockPrisma.partner.findUnique.mockResolvedValue(existingPartner as any);
      mockPrisma.partner.delete.mockResolvedValue(existingPartner as any);

      await deletePartner('partner-1');

      expect(mockPrisma.partner.delete).toHaveBeenCalledWith({
        where: { id: 'partner-1' },
      });
    });

    it('should throw error when deleting partner owned by another user', async () => {
      mockSession = sessionUserA;
      const otherUserPartner = createMockPartner(userB.id, { id: 'partner-2' });
      mockPrisma.partner.findUnique.mockResolvedValue(otherUserPartner as any);

      await expect(deletePartner('partner-2')).rejects.toThrow('Parceiro não encontrado');
    });

    it('should throw error for non-existent partner', async () => {
      mockSession = sessionUserA;
      mockPrisma.partner.findUnique.mockResolvedValue(null);

      await expect(deletePartner('non-existent')).rejects.toThrow('Parceiro não encontrado');
    });

    it('should allow admin to delete any partner', async () => {
      mockSession = sessionAdmin;
      const userAPartner = createMockPartner(userA.id, { id: 'partner-1' });
      mockPrisma.partner.findUnique.mockResolvedValue(userAPartner as any);
      mockPrisma.partner.delete.mockResolvedValue(userAPartner as any);

      await deletePartner('partner-1');

      expect(mockPrisma.partner.delete).toHaveBeenCalled();
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(deletePartner('partner-1')).rejects.toThrow('Não autorizado');
    });

    // Triangulation: User B can delete their own partner
    it('should allow User B to delete their own partner', async () => {
      mockSession = sessionUserB;
      const userBPartner = createMockPartner(userB.id, { id: 'partner-b' });
      mockPrisma.partner.findUnique.mockResolvedValue(userBPartner as any);
      mockPrisma.partner.delete.mockResolvedValue(userBPartner as any);

      await deletePartner('partner-b');

      expect(mockPrisma.partner.delete).toHaveBeenCalledWith({
        where: { id: 'partner-b' },
      });
    });

    // Triangulation: User B cannot delete User A's partner
    it('should block User B from deleting User A partner', async () => {
      mockSession = sessionUserB;
      const userAPartner = createMockPartner(userA.id, { id: 'partner-a' });
      mockPrisma.partner.findUnique.mockResolvedValue(userAPartner as any);

      await expect(deletePartner('partner-a')).rejects.toThrow('Parceiro não encontrado');
    });
  });
});
