import { describe, it, expect, vi } from 'vitest';
import { prismaMock } from '../setup';
import { mockUser, mockSession } from '../fixtures';
import { getServerSession } from 'next-auth';

describe('Test Setup Validation', () => {
  describe('Fixtures', () => {
    it('should have valid user fixture', () => {
      expect(mockUser).toBeDefined();
      expect(mockUser.id).toBe('user-test-123');
      expect(mockUser.email).toBe('test@example.com');
      expect(mockUser.role).toBe('user');
    });

    it('should have valid session fixture', () => {
      expect(mockSession).toBeDefined();
      expect(mockSession.user).toBeDefined();
      expect(mockSession.user.id).toBe('user-test-123');
    });
  });

  describe('Prisma Mock', () => {
    it('should mock prisma client', () => {
      expect(prismaMock).toBeDefined();
      expect(prismaMock.user).toBeDefined();
      expect(prismaMock.contact).toBeDefined();
      expect(prismaMock.deal).toBeDefined();
      expect(prismaMock.lead).toBeDefined();
    });

    it('should allow mocking prisma operations', async () => {
      // Mock findUnique
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await prismaMock.user.findUnique({
        where: { id: 'user-test-123' },
      });

      expect(result).toEqual(mockUser);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-test-123' },
      });
    });

    it('should allow mocking prisma create', async () => {
      const newUser = { ...mockUser, id: 'new-user' };
      prismaMock.user.create.mockResolvedValue(newUser);

      const result = await prismaMock.user.create({
        data: {
          email: 'new@example.com',
          name: 'New User',
          password: 'hashed',
        },
      });

      expect(result.id).toBe('new-user');
      expect(prismaMock.user.create).toHaveBeenCalled();
    });
  });

  describe('NextAuth Mock', () => {
    it('should mock getServerSession', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const session = await getServerSession();

      expect(session).toEqual(mockSession);
      expect(session?.user.id).toBe('user-test-123');
    });

    it('should allow mocking null session (unauthorized)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const session = await getServerSession();

      expect(session).toBeNull();
    });
  });

  describe('Mock Cleanup', () => {
    it('should reset mocks between tests', () => {
      // Este teste verifica se os mocks foram limpos do teste anterior
      expect(vi.mocked(getServerSession).mock.calls.length).toBe(0);
    });
  });
});
