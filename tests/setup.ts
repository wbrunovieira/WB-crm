import { beforeAll, afterEach, afterAll, vi } from 'vitest';

// The frontend no longer talks to the database directly (data access moved to the
// NestJS backend); these mocks cover the Next.js primitives the remaining unit
// tests rely on. The old Prisma mock was removed with the obsolete server-action
// tests — see CLAUDE.md ("no Prisma in src/").

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
  console.log('🧪 Iniciando suite de testes...');
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  console.log('✅ Suite de testes finalizada!');
});
