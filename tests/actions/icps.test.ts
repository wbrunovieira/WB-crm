/**
 * ICP (Ideal Customer Profile) Action Tests
 *
 * Tests for src/actions/icps.ts including:
 * - Creating ICPs
 * - Getting ICPs (list and by ID)
 * - Updating ICPs with versioning
 * - Deleting ICPs
 * - Restoring ICP versions
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prismaMock } from '../setup';
import type { ICPFormData } from '@/lib/validations/icp';
import {
  userA,
  userB,
  adminUser,
  sessionUserA,
  sessionUserB,
  sessionAdmin,
} from '../fixtures/multiple-users';

// Import Server Actions (will be created)
import {
  createICP,
  getICPs,
  getICPById,
  updateICP,
  deleteICP,
  getICPVersions,
  restoreICPVersion,
} from '@/actions/icps';

const mockedGetServerSession = vi.mocked(getServerSession);

// Helper to create mock ICP
function createMockICP(ownerId: string, overrides?: Partial<{
  id: string;
  name: string;
  slug: string;
  content: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}>) {
  return {
    id: 'icp-test-id',
    name: 'Test ICP',
    slug: 'test-icp',
    content: 'Perfil ideal de cliente para empresas de tecnologia...',
    status: 'draft',
    ownerId,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// Helper to create mock ICP Version
function createMockICPVersion(icpId: string, versionNumber: number, changedBy: string, overrides?: Partial<{
  id: string;
  name: string;
  content: string;
  status: string;
  changeReason: string | null;
  createdAt: Date;
}>) {
  return {
    id: `icp-version-${versionNumber}`,
    icpId,
    versionNumber,
    name: 'Test ICP',
    content: 'Conteúdo da versão...',
    status: 'draft',
    changedBy,
    changeReason: null,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// ============ CREATE ICP TESTS ============

describe('ICP Actions - createICP', () => {
  describe('successful creation', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should create ICP with valid data', async () => {
      const icpData: ICPFormData = {
        name: 'Startup de Tecnologia',
        slug: 'startup-tech',
        content: 'Empresas de tecnologia com 10-50 funcionários...',
        status: 'draft',
      };

      const createdICP = createMockICP(userA.id, {
        ...icpData,
        id: 'new-icp-id',
      });

      prismaMock.iCP.findUnique.mockResolvedValue(null); // Slug not exists
      prismaMock.iCP.create.mockResolvedValue(createdICP);
      prismaMock.iCPVersion.create.mockResolvedValue(
        createMockICPVersion('new-icp-id', 1, userA.id)
      );

      const result = await createICP(icpData);

      expect(result.name).toBe('Startup de Tecnologia');
      expect(result.slug).toBe('startup-tech');
      expect(prismaMock.iCP.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Startup de Tecnologia',
          slug: 'startup-tech',
          ownerId: userA.id,
          status: 'draft',
        }),
      });
    });

    it('should create initial version (v1) when creating ICP', async () => {
      const icpData: ICPFormData = {
        name: 'E-commerce',
        slug: 'ecommerce',
        content: 'Lojas virtuais de médio porte...',
        status: 'draft',
      };

      const createdICP = createMockICP(userA.id, {
        ...icpData,
        id: 'new-icp-id',
      });

      prismaMock.iCP.findUnique.mockResolvedValue(null);
      prismaMock.iCP.create.mockResolvedValue(createdICP);
      prismaMock.iCPVersion.create.mockResolvedValue(
        createMockICPVersion('new-icp-id', 1, userA.id)
      );

      await createICP(icpData);

      expect(prismaMock.iCPVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          icpId: 'new-icp-id',
          versionNumber: 1,
          name: 'E-commerce',
          content: 'Lojas virtuais de médio porte...',
          status: 'draft',
          changedBy: userA.id,
          changeReason: 'Criação inicial',
        }),
      });
    });

    it('should reject duplicate slug', async () => {
      const icpData: ICPFormData = {
        name: 'Test',
        slug: 'existing-slug',
        content: 'Content...',
        status: 'draft',
      };

      prismaMock.iCP.findUnique.mockResolvedValue(
        createMockICP(userA.id, { slug: 'existing-slug' })
      );

      await expect(createICP(icpData)).rejects.toThrow('Slug já existe');
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      await expect(
        createICP({
          name: 'Test',
          slug: 'test',
          content: 'Content...',
          status: 'draft',
        })
      ).rejects.toThrow('Não autorizado');
    });
  });

  describe('validation', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should reject invalid slug format', async () => {
      await expect(
        createICP({
          name: 'Test',
          slug: 'Invalid Slug!',
          content: 'Content...',
          status: 'draft',
        })
      ).rejects.toThrow();
    });

    it('should reject empty content', async () => {
      await expect(
        createICP({
          name: 'Test',
          slug: 'test',
          content: '',
          status: 'draft',
        })
      ).rejects.toThrow();
    });
  });
});

// ============ GET ICPs TESTS ============

describe('ICP Actions - getICPs', () => {
  describe('successful retrieval', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should return ICPs owned by user', async () => {
      const icps = [
        createMockICP(userA.id, { id: 'icp-1', name: 'ICP 1' }),
        createMockICP(userA.id, { id: 'icp-2', name: 'ICP 2' }),
      ];

      prismaMock.iCP.findMany.mockResolvedValue(icps);

      const result = await getICPs();

      expect(result).toHaveLength(2);
      expect(prismaMock.iCP.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });

    it('should filter by status', async () => {
      const activeICPs = [
        createMockICP(userA.id, { status: 'active' }),
      ];

      prismaMock.iCP.findMany.mockResolvedValue(activeICPs);

      await getICPs({ status: 'active' });

      expect(prismaMock.iCP.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'active',
          }),
        })
      );
    });

    it('should filter by search term', async () => {
      prismaMock.iCP.findMany.mockResolvedValue([]);

      await getICPs({ search: 'tech' });

      expect(prismaMock.iCP.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'tech' } },
              { content: { contains: 'tech' } },
            ]),
          }),
        })
      );
    });
  });

  describe('admin access', () => {
    it('should allow admin to see all ICPs', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const allICPs = [
        createMockICP(userA.id, { id: 'icp-1' }),
        createMockICP(userB.id, { id: 'icp-2' }),
      ];

      prismaMock.iCP.findMany.mockResolvedValue(allICPs);

      const result = await getICPs();

      expect(result).toHaveLength(2);
    });
  });
});

// ============ GET ICP BY ID TESTS ============

describe('ICP Actions - getICPById', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(sessionUserA);
  });

  it('should return ICP with versions and links count', async () => {
    const icp = {
      ...createMockICP(userA.id, { id: 'icp-1' }),
      _count: {
        leads: 5,
        organizations: 3,
        versions: 2,
      },
    };

    prismaMock.iCP.findFirst.mockResolvedValue(icp);

    const result = await getICPById('icp-1');

    expect(result).not.toBeNull();
    expect(result?.id).toBe('icp-1');
    expect(result?._count.leads).toBe(5);
  });

  it('should return null for non-existent ICP', async () => {
    prismaMock.iCP.findFirst.mockResolvedValue(null);

    const result = await getICPById('non-existent');

    expect(result).toBeNull();
  });

  it('should not return ICP owned by another user', async () => {
    prismaMock.iCP.findFirst.mockResolvedValue(null);

    const result = await getICPById('icp-owned-by-userB');

    expect(result).toBeNull();
    expect(prismaMock.iCP.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'icp-owned-by-userB',
          ownerId: userA.id,
        }),
      })
    );
  });
});

// ============ UPDATE ICP TESTS ============

describe('ICP Actions - updateICP', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(sessionUserA);
  });

  describe('successful update', () => {
    it('should update ICP and create new version', async () => {
      const existingICP = createMockICP(userA.id, { id: 'icp-1' });
      const lastVersion = createMockICPVersion('icp-1', 1, userA.id);

      prismaMock.iCP.findUnique.mockResolvedValue(existingICP);
      prismaMock.iCPVersion.findFirst.mockResolvedValue(lastVersion);
      prismaMock.iCP.update.mockResolvedValue({
        ...existingICP,
        content: 'Updated content...',
      });
      prismaMock.iCPVersion.create.mockResolvedValue(
        createMockICPVersion('icp-1', 2, userA.id)
      );

      const result = await updateICP('icp-1', {
        content: 'Updated content...',
        changeReason: 'Melhorado com base em feedback',
      });

      expect(result.content).toBe('Updated content...');
      expect(prismaMock.iCPVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          icpId: 'icp-1',
          versionNumber: 2,
          changeReason: 'Melhorado com base em feedback',
        }),
      });
    });

    it('should increment version number correctly', async () => {
      const existingICP = createMockICP(userA.id, { id: 'icp-1' });
      const lastVersion = createMockICPVersion('icp-1', 5, userA.id);

      prismaMock.iCP.findUnique.mockResolvedValue(existingICP);
      prismaMock.iCPVersion.findFirst.mockResolvedValue(lastVersion);
      prismaMock.iCP.update.mockResolvedValue(existingICP);
      prismaMock.iCPVersion.create.mockResolvedValue(
        createMockICPVersion('icp-1', 6, userA.id)
      );

      await updateICP('icp-1', { name: 'New Name' });

      expect(prismaMock.iCPVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          versionNumber: 6,
        }),
      });
    });
  });

  describe('ownership check', () => {
    it('should not allow updating ICP owned by another user', async () => {
      prismaMock.iCP.findUnique.mockResolvedValue(
        createMockICP(userB.id, { id: 'icp-userB' })
      );

      await expect(
        updateICP('icp-userB', { content: 'Hacked!' })
      ).rejects.toThrow('ICP não encontrado');
    });
  });
});

// ============ DELETE ICP TESTS ============

describe('ICP Actions - deleteICP', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(sessionUserA);
  });

  it('should delete ICP owned by user', async () => {
    const existingICP = createMockICP(userA.id, { id: 'icp-1' });

    prismaMock.iCP.findUnique.mockResolvedValue(existingICP);
    prismaMock.iCP.delete.mockResolvedValue(existingICP);

    await deleteICP('icp-1');

    expect(prismaMock.iCP.delete).toHaveBeenCalledWith({
      where: { id: 'icp-1' },
    });
  });

  it('should not allow deleting ICP owned by another user', async () => {
    prismaMock.iCP.findUnique.mockResolvedValue(
      createMockICP(userB.id, { id: 'icp-userB' })
    );

    await expect(deleteICP('icp-userB')).rejects.toThrow('ICP não encontrado');
  });

  it('should throw error for non-existent ICP', async () => {
    prismaMock.iCP.findUnique.mockResolvedValue(null);

    await expect(deleteICP('non-existent')).rejects.toThrow('ICP não encontrado');
  });
});

// ============ GET ICP VERSIONS TESTS ============

describe('ICP Actions - getICPVersions', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(sessionUserA);
  });

  it('should return version history ordered by version number desc', async () => {
    const versions = [
      createMockICPVersion('icp-1', 3, userA.id, { changeReason: 'Versão 3' }),
      createMockICPVersion('icp-1', 2, userA.id, { changeReason: 'Versão 2' }),
      createMockICPVersion('icp-1', 1, userA.id, { changeReason: 'Criação inicial' }),
    ];

    prismaMock.iCP.findFirst.mockResolvedValue(createMockICP(userA.id, { id: 'icp-1' }));
    prismaMock.iCPVersion.findMany.mockResolvedValue(versions);

    const result = await getICPVersions('icp-1');

    expect(result).toHaveLength(3);
    expect(result[0].versionNumber).toBe(3);
    expect(prismaMock.iCPVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { versionNumber: 'desc' },
      })
    );
  });
});

// ============ RESTORE ICP VERSION TESTS ============

describe('ICP Actions - restoreICPVersion', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(sessionUserA);
  });

  it('should restore ICP to previous version and create new version', async () => {
    const existingICP = createMockICP(userA.id, {
      id: 'icp-1',
      content: 'Current content',
    });
    const versionToRestore = createMockICPVersion('icp-1', 2, userA.id, {
      name: 'Old Name',
      content: 'Old content',
      status: 'draft',
    });
    const currentVersion = createMockICPVersion('icp-1', 4, userA.id);

    prismaMock.iCP.findFirst.mockResolvedValue(existingICP);
    prismaMock.iCPVersion.findUnique.mockResolvedValue(versionToRestore);
    prismaMock.iCPVersion.findFirst.mockResolvedValue(currentVersion);
    prismaMock.iCP.update.mockResolvedValue({
      ...existingICP,
      name: 'Old Name',
      content: 'Old content',
    });
    prismaMock.iCPVersion.create.mockResolvedValue(
      createMockICPVersion('icp-1', 5, userA.id)
    );

    const result = await restoreICPVersion('icp-1', 2);

    expect(result.content).toBe('Old content');
    expect(prismaMock.iCPVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        versionNumber: 5,
        changeReason: expect.stringContaining('Restaurado da versão 2'),
      }),
    });
  });

  it('should throw error for non-existent version', async () => {
    prismaMock.iCP.findFirst.mockResolvedValue(createMockICP(userA.id, { id: 'icp-1' }));
    prismaMock.iCPVersion.findUnique.mockResolvedValue(null);

    await expect(restoreICPVersion('icp-1', 99)).rejects.toThrow('Versão não encontrada');
  });
});
