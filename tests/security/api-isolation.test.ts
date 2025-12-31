/**
 * API Routes Data Isolation Tests
 *
 * CRITICAL: These tests verify that API routes enforce data isolation between users.
 * Users should NEVER be able to access, update, or delete data from other users via API.
 *
 * Strategy: Triangulation
 * - User A's API calls should only return User A's data
 * - User A should NOT be able to access User B's data via API
 * - Unauthenticated requests should return 401
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prismaMock } from '../setup';
import {
  userA,
  userB,
  sessionUserA,
  sessionUserB,
  createMockDeal,
  createMockContact,
  createMockActivity,
  createMockOrganization,
} from '../fixtures/multiple-users';

// Import API route handlers
import { GET as getDeals, POST as postDeal } from '@/app/api/deals/route';
import { GET as getDealById, PUT as putDeal, DELETE as deleteDeal } from '@/app/api/deals/[id]/route';
import { GET as getContacts, POST as postContact } from '@/app/api/contacts/route';
import { GET as getContactById, PUT as putContact, DELETE as deleteContact } from '@/app/api/contacts/[id]/route';
import { GET as getActivities, POST as postActivity } from '@/app/api/activities/route';
import { GET as getOrganizations, POST as postOrganization } from '@/app/api/organizations/route';

// Type for mocked getServerSession
const mockedGetServerSession = vi.mocked(getServerSession);

// Helper to create mock Request
function createMockRequest(url: string, options: RequestInit = {}): Request {
  return new Request(url, options);
}

// Helper to parse JSON response
async function parseJsonResponse(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

describe('API Routes - Authentication Required', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(null);
  });

  it('GET /api/deals should return 401 when not authenticated', async () => {
    const request = createMockRequest('http://localhost:3000/api/deals');
    const response = await getDeals(request);

    expect(response.status).toBe(401);
    const data = await parseJsonResponse(response);
    expect(data.error).toBe('Não autorizado');
  });

  it('GET /api/contacts should return 401 when not authenticated', async () => {
    const request = createMockRequest('http://localhost:3000/api/contacts');
    const response = await getContacts(request);

    expect(response.status).toBe(401);
    const data = await parseJsonResponse(response);
    expect(data.error).toBe('Não autorizado');
  });

  it('GET /api/activities should return 401 when not authenticated', async () => {
    const request = createMockRequest('http://localhost:3000/api/activities');
    const response = await getActivities(request);

    expect(response.status).toBe(401);
    const data = await parseJsonResponse(response);
    expect(data.error).toBe('Não autorizado');
  });

  it('GET /api/organizations should return 401 when not authenticated', async () => {
    const request = createMockRequest('http://localhost:3000/api/organizations');
    const response = await getOrganizations(request);

    expect(response.status).toBe(401);
    const data = await parseJsonResponse(response);
    expect(data.error).toBe('Não autorizado');
  });

  it('POST /api/deals should return 401 when not authenticated', async () => {
    const request = createMockRequest('http://localhost:3000/api/deals', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test Deal', value: 1000, stageId: 'stage-1' }),
    });
    const response = await postDeal(request);

    expect(response.status).toBe(401);
  });

  it('GET /api/deals/[id] should return 401 when not authenticated', async () => {
    const request = createMockRequest('http://localhost:3000/api/deals/deal-123');
    const response = await getDealById(request, { params: { id: 'deal-123' } });

    expect(response.status).toBe(401);
  });

  it('PUT /api/deals/[id] should return 401 when not authenticated', async () => {
    const request = createMockRequest('http://localhost:3000/api/deals/deal-123', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated', value: 1000, stageId: 'stage-1' }),
    });
    const response = await putDeal(request, { params: { id: 'deal-123' } });

    expect(response.status).toBe(401);
  });

  it('DELETE /api/deals/[id] should return 401 when not authenticated', async () => {
    const request = createMockRequest('http://localhost:3000/api/deals/deal-123', {
      method: 'DELETE',
    });
    const response = await deleteDeal(request, { params: { id: 'deal-123' } });

    expect(response.status).toBe(401);
  });
});

describe('API Routes - Deals Isolation', () => {
  describe('GET /api/deals', () => {
    it('should return only deals owned by User A when User A is authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const dealUserA = createMockDeal(userA.id, { id: 'deal-a-1', title: 'Deal A' });

      prismaMock.deal.findMany.mockResolvedValue([dealUserA]);

      const request = createMockRequest('http://localhost:3000/api/deals');
      const response = await getDeals(request);

      expect(response.status).toBe(200);
      expect(prismaMock.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );

      const data = await parseJsonResponse(response);
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('deal-a-1');
    });

    it('should return only deals owned by User B when User B is authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserB);

      const dealUserB = createMockDeal(userB.id, { id: 'deal-b-1', title: 'Deal B' });

      prismaMock.deal.findMany.mockResolvedValue([dealUserB]);

      const request = createMockRequest('http://localhost:3000/api/deals');
      const response = await getDeals(request);

      expect(response.status).toBe(200);
      expect(prismaMock.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userB.id,
          }),
        })
      );

      const data = await parseJsonResponse(response);
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('deal-b-1');
    });

    it('should return empty array when user has no deals', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.deal.findMany.mockResolvedValue([]);

      const request = createMockRequest('http://localhost:3000/api/deals');
      const response = await getDeals(request);

      expect(response.status).toBe(200);
      const data = await parseJsonResponse(response);
      expect(data).toHaveLength(0);
    });
  });

  describe('GET /api/deals/[id]', () => {
    it('should return deal when User A requests their own deal', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const dealUserA = createMockDeal(userA.id, { id: 'deal-a-1' });

      prismaMock.deal.findUnique.mockResolvedValue(dealUserA);

      const request = createMockRequest('http://localhost:3000/api/deals/deal-a-1');
      const response = await getDealById(request, { params: { id: 'deal-a-1' } });

      expect(response.status).toBe(200);
      expect(prismaMock.deal.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'deal-a-1',
            ownerId: userA.id,
          }),
        })
      );
    });

    it('should return 404 when User A requests User B deal', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      // Query with ownerId filter returns null (deal belongs to User B)
      prismaMock.deal.findUnique.mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/deals/deal-b-1');
      const response = await getDealById(request, { params: { id: 'deal-b-1' } });

      expect(response.status).toBe(404);
      const data = await parseJsonResponse(response);
      expect(data.error).toBe('Negócio não encontrado');
    });

    it('should return 404 for non-existent deal', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.deal.findUnique.mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/deals/non-existent');
      const response = await getDealById(request, { params: { id: 'non-existent' } });

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/deals/[id]', () => {
    it('should allow User A to update their own deal', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const existingDeal = createMockDeal(userA.id, { id: 'deal-a-1' });
      const updatedDeal = { ...existingDeal, title: 'Updated Deal' };

      prismaMock.deal.findUnique.mockResolvedValue(existingDeal);
      prismaMock.deal.update.mockResolvedValue(updatedDeal);

      const request = createMockRequest('http://localhost:3000/api/deals/deal-a-1', {
        method: 'PUT',
        body: JSON.stringify({
          title: 'Updated Deal',
          value: 10000,
          stageId: 'stage-1',
          currency: 'BRL',
          status: 'open',
        }),
      });
      const response = await putDeal(request, { params: { id: 'deal-a-1' } });

      expect(response.status).toBe(200);
      expect(prismaMock.deal.update).toHaveBeenCalled();
    });

    it('should return 404 when User A tries to update User B deal', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      // Deal belongs to User B
      const dealUserB = createMockDeal(userB.id, { id: 'deal-b-1' });

      prismaMock.deal.findUnique.mockResolvedValue(dealUserB);

      const request = createMockRequest('http://localhost:3000/api/deals/deal-b-1', {
        method: 'PUT',
        body: JSON.stringify({
          title: 'Hacked Deal',
          value: 10000,
          stageId: 'stage-1',
          currency: 'BRL',
          status: 'open',
        }),
      });
      const response = await putDeal(request, { params: { id: 'deal-b-1' } });

      expect(response.status).toBe(404);
      expect(prismaMock.deal.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/deals/[id]', () => {
    it('should allow User A to delete their own deal', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const dealUserA = createMockDeal(userA.id, { id: 'deal-a-1' });

      prismaMock.deal.findUnique.mockResolvedValue(dealUserA);
      prismaMock.deal.delete.mockResolvedValue(dealUserA);

      const request = createMockRequest('http://localhost:3000/api/deals/deal-a-1', {
        method: 'DELETE',
      });
      const response = await deleteDeal(request, { params: { id: 'deal-a-1' } });

      expect(response.status).toBe(200);
      expect(prismaMock.deal.delete).toHaveBeenCalled();
    });

    it('should return 404 when User A tries to delete User B deal', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const dealUserB = createMockDeal(userB.id, { id: 'deal-b-1' });

      prismaMock.deal.findUnique.mockResolvedValue(dealUserB);

      const request = createMockRequest('http://localhost:3000/api/deals/deal-b-1', {
        method: 'DELETE',
      });
      const response = await deleteDeal(request, { params: { id: 'deal-b-1' } });

      expect(response.status).toBe(404);
      expect(prismaMock.deal.delete).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/deals', () => {
    it('should set ownerId to authenticated user when creating deal', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const newDeal = createMockDeal(userA.id, { id: 'new-deal' });

      prismaMock.deal.create.mockResolvedValue(newDeal);

      const request = createMockRequest('http://localhost:3000/api/deals', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Deal',
          value: 5000,
          stageId: 'stage-1',
          currency: 'BRL',
          status: 'open',
        }),
      });
      const response = await postDeal(request);

      expect(response.status).toBe(201);
      expect(prismaMock.deal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });
  });
});

describe('API Routes - Contacts Isolation', () => {
  describe('GET /api/contacts', () => {
    it('should return only contacts owned by User A when User A is authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const contactUserA = createMockContact(userA.id, { id: 'contact-a-1' });

      prismaMock.contact.findMany.mockResolvedValue([contactUserA]);

      const request = createMockRequest('http://localhost:3000/api/contacts');
      const response = await getContacts(request);

      expect(response.status).toBe(200);
      expect(prismaMock.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });

    it('should return only contacts owned by User B when User B is authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserB);

      const contactUserB = createMockContact(userB.id, { id: 'contact-b-1' });

      prismaMock.contact.findMany.mockResolvedValue([contactUserB]);

      const request = createMockRequest('http://localhost:3000/api/contacts');
      const response = await getContacts(request);

      expect(response.status).toBe(200);
      expect(prismaMock.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userB.id,
          }),
        })
      );
    });
  });

  describe('GET /api/contacts/[id]', () => {
    it('should return contact when User A requests their own contact', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const contactUserA = createMockContact(userA.id, { id: 'contact-a-1' });

      prismaMock.contact.findFirst.mockResolvedValue(contactUserA);

      const request = createMockRequest('http://localhost:3000/api/contacts/contact-a-1');
      const response = await getContactById(request, { params: { id: 'contact-a-1' } });

      expect(response.status).toBe(200);
      expect(prismaMock.contact.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'contact-a-1',
            ownerId: userA.id,
          }),
        })
      );
    });

    it('should return 404 when User A requests User B contact', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.contact.findFirst.mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/contacts/contact-b-1');
      const response = await getContactById(request, { params: { id: 'contact-b-1' } });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/contacts/[id]', () => {
    it('should use ownerId in delete where clause', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const contactUserA = createMockContact(userA.id, { id: 'contact-a-1' });

      prismaMock.contact.delete.mockResolvedValue(contactUserA);

      const request = createMockRequest('http://localhost:3000/api/contacts/contact-a-1', {
        method: 'DELETE',
      });
      const response = await deleteContact(request, { params: { id: 'contact-a-1' } });

      expect(response.status).toBe(200);
      expect(prismaMock.contact.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'contact-a-1',
            ownerId: userA.id,
          }),
        })
      );
    });
  });
});

describe('API Routes - Activities Isolation', () => {
  describe('GET /api/activities', () => {
    it('should return only activities owned by User A when User A is authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const activityUserA = createMockActivity(userA.id, { id: 'activity-a-1' });

      prismaMock.activity.findMany.mockResolvedValue([activityUserA]);

      const request = createMockRequest('http://localhost:3000/api/activities');
      const response = await getActivities(request);

      expect(response.status).toBe(200);
      expect(prismaMock.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });

    it('should return only activities owned by User B when User B is authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserB);

      const activityUserB = createMockActivity(userB.id, { id: 'activity-b-1' });

      prismaMock.activity.findMany.mockResolvedValue([activityUserB]);

      const request = createMockRequest('http://localhost:3000/api/activities');
      const response = await getActivities(request);

      expect(response.status).toBe(200);
      expect(prismaMock.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userB.id,
          }),
        })
      );
    });
  });

  describe('POST /api/activities', () => {
    it('should set ownerId to authenticated user when creating activity', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const newActivity = createMockActivity(userA.id, { id: 'new-activity' });

      prismaMock.activity.create.mockResolvedValue(newActivity);

      const request = createMockRequest('http://localhost:3000/api/activities', {
        method: 'POST',
        body: JSON.stringify({
          type: 'call',
          subject: 'New Activity',
        }),
      });
      const response = await postActivity(request);

      expect(response.status).toBe(201);
      expect(prismaMock.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });
  });
});

describe('API Routes - Organizations Isolation', () => {
  describe('GET /api/organizations', () => {
    it('should return only organizations owned by User A when User A is authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const orgUserA = createMockOrganization(userA.id, { id: 'org-a-1' });

      prismaMock.organization.findMany.mockResolvedValue([orgUserA]);

      const request = createMockRequest('http://localhost:3000/api/organizations');
      const response = await getOrganizations(request);

      expect(response.status).toBe(200);
      expect(prismaMock.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });

    it('should return only organizations owned by User B when User B is authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserB);

      const orgUserB = createMockOrganization(userB.id, { id: 'org-b-1' });

      prismaMock.organization.findMany.mockResolvedValue([orgUserB]);

      const request = createMockRequest('http://localhost:3000/api/organizations');
      const response = await getOrganizations(request);

      expect(response.status).toBe(200);
      expect(prismaMock.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userB.id,
          }),
        })
      );
    });
  });

  describe('POST /api/organizations', () => {
    it('should set ownerId to authenticated user when creating organization', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const newOrg = createMockOrganization(userA.id, { id: 'new-org' });

      prismaMock.organization.create.mockResolvedValue(newOrg);

      const request = createMockRequest('http://localhost:3000/api/organizations', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Organization',
        }),
      });
      const response = await postOrganization(request);

      expect(response.status).toBe(201);
      expect(prismaMock.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });
  });
});
