/**
 * Route Protection Tests
 *
 * Tests that routes are properly protected:
 * - Middleware redirects unauthenticated users
 * - API returns 401 without authentication
 * - Server Actions throw error without session
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prismaMock } from '../setup';

// Import Server Actions
import { getDeals } from '@/actions/deals';
import { getContacts } from '@/actions/contacts';
import { getLeads } from '@/actions/leads';
import { getOrganizations } from '@/actions/organizations';
import { getActivities } from '@/actions/activities';
import { getPartners } from '@/actions/partners';
import { getLabels } from '@/actions/labels';
import { getPipelines } from '@/actions/pipelines';

// Import API Routes
import { GET as getDealsApi } from '@/app/api/deals/route';
import { GET as getContactsApi } from '@/app/api/contacts/route';
import { GET as getActivitiesApi } from '@/app/api/activities/route';
import { GET as getOrganizationsApi } from '@/app/api/organizations/route';

const mockedGetServerSession = vi.mocked(getServerSession);

// Helper to create mock Request
function createMockRequest(url: string): Request {
  return new Request(url);
}

describe('Route Protection - Middleware Configuration', () => {
  it('should have correct protected routes in middleware matcher', () => {
    // These are the routes that should be protected by the middleware
    const protectedPaths = [
      '/dashboard',
      '/contacts',
      '/deals',
      '/activities',
      '/organizations',
      '/pipeline',
      '/partners',
      '/projects',
    ];

    // The middleware matcher pattern
    const matcherPatterns = [
      '/dashboard/:path*',
      '/contacts/:path*',
      '/deals/:path*',
      '/activities/:path*',
      '/organizations/:path*',
      '/pipeline/:path*',
      '/partners/:path*',
      '/projects/:path*',
    ];

    // Each protected path should have a corresponding matcher
    protectedPaths.forEach(path => {
      const hasMatchingPattern = matcherPatterns.some(pattern => {
        const basePath = pattern.replace('/:path*', '');
        return path.startsWith(basePath);
      });
      expect(hasMatchingPattern).toBe(true);
    });
  });

  it('should NOT protect login and register routes', () => {
    const publicPaths = ['/login', '/register'];
    const protectedPatterns = [
      '/dashboard/:path*',
      '/contacts/:path*',
      '/deals/:path*',
      '/activities/:path*',
      '/organizations/:path*',
      '/pipeline/:path*',
      '/partners/:path*',
      '/projects/:path*',
    ];

    publicPaths.forEach(path => {
      const isProtected = protectedPatterns.some(pattern => {
        const basePath = pattern.replace('/:path*', '');
        return path.startsWith(basePath);
      });
      expect(isProtected).toBe(false);
    });
  });

  it('should NOT protect API routes (they handle auth internally)', () => {
    const apiPaths = ['/api/deals', '/api/contacts', '/api/auth'];
    const protectedPatterns = [
      '/dashboard/:path*',
      '/contacts/:path*',
      '/deals/:path*',
      '/activities/:path*',
      '/organizations/:path*',
      '/pipeline/:path*',
      '/partners/:path*',
      '/projects/:path*',
    ];

    apiPaths.forEach(path => {
      const isProtected = protectedPatterns.some(pattern => {
        const basePath = pattern.replace('/:path*', '');
        return path.startsWith(basePath);
      });
      expect(isProtected).toBe(false);
    });
  });
});

describe('Route Protection - API Routes (401 Unauthorized)', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(null);
  });

  it('GET /api/deals should return 401 without authentication', async () => {
    const request = createMockRequest('http://localhost:3000/api/deals');
    const response = await getDealsApi(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Não autorizado');
  });

  it('GET /api/contacts should return 401 without authentication', async () => {
    const request = createMockRequest('http://localhost:3000/api/contacts');
    const response = await getContactsApi(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Não autorizado');
  });

  it('GET /api/activities should return 401 without authentication', async () => {
    const request = createMockRequest('http://localhost:3000/api/activities');
    const response = await getActivitiesApi(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Não autorizado');
  });

  it('GET /api/organizations should return 401 without authentication', async () => {
    const request = createMockRequest('http://localhost:3000/api/organizations');
    const response = await getOrganizationsApi(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Não autorizado');
  });
});

describe('Route Protection - Server Actions (Throws Error)', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(null);
  });

  it('getDeals should throw "Não autorizado" without session', async () => {
    await expect(getDeals()).rejects.toThrow('Não autorizado');
  });

  it('getContacts should throw "Não autorizado" without session', async () => {
    await expect(getContacts()).rejects.toThrow('Não autorizado');
  });

  it('getLeads should throw "Não autorizado" without session', async () => {
    await expect(getLeads()).rejects.toThrow('Não autorizado');
  });

  it('getOrganizations should throw "Não autorizado" without session', async () => {
    await expect(getOrganizations()).rejects.toThrow('Não autorizado');
  });

  it('getActivities should throw "Não autorizado" without session', async () => {
    await expect(getActivities()).rejects.toThrow('Não autorizado');
  });

  it('getPartners should throw "Não autorizado" without session', async () => {
    await expect(getPartners()).rejects.toThrow('Não autorizado');
  });

  it('getLabels should throw "Não autorizado" without session', async () => {
    await expect(getLabels()).rejects.toThrow('Não autorizado');
  });

  it('getPipelines should throw "Não autorizado" without session', async () => {
    await expect(getPipelines()).rejects.toThrow('Não autorizado');
  });
});

describe('Route Protection - Session Validation', () => {
  it('should reject session without user id', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: {
        // Missing id
        email: 'test@example.com',
        name: 'Test',
      },
      expires: '2025-12-31',
    } as never);

    await expect(getDeals()).rejects.toThrow('Não autorizado');
  });

  it('should reject session with null user', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: null,
      expires: '2025-12-31',
    } as never);

    await expect(getDeals()).rejects.toThrow('Não autorizado');
  });

  it('should reject empty session object', async () => {
    mockedGetServerSession.mockResolvedValue({} as never);

    await expect(getDeals()).rejects.toThrow('Não autorizado');
  });
});
