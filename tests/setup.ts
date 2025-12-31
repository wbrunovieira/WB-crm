import { beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

// Mock Prisma Client
export const prismaMock = mockDeep<PrismaClient>();

// Mock do módulo @/lib/prisma
vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

// Mock NextAuth getServerSession
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Mock next/cache revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
}));

beforeAll(() => {
  // Setup global antes de todos os testes
  console.log('🧪 Iniciando suite de testes...');
});

// Setup default mock for sharedEntity before each test
// This ensures getOwnerOrSharedFilter and canAccessEntity work correctly in all tests
// Individual tests can override these mocks if they need to test sharing behavior
beforeEach(() => {
  // For getSharedEntityIds (used by getOwnerOrSharedFilter)
  prismaMock.sharedEntity.findMany.mockResolvedValue([]);
  // For canAccessEntity (checks if entity is shared with user)
  prismaMock.sharedEntity.findFirst.mockResolvedValue(null);
});

afterEach(() => {
  // Limpar mocks após cada teste
  mockReset(prismaMock);
  vi.clearAllMocks();
});

afterAll(() => {
  // Cleanup após todos os testes
  console.log('✅ Suite de testes finalizada!');
});
