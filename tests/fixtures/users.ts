import type { User } from '@prisma/client';
import type { Session } from 'next-auth';
import type { UserRole } from '@/types/next-auth';

export const mockUser: User = {
  id: 'user-test-123',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: null,
  image: null,
  password: 'hashed-password-123',
  role: 'sdr',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockAdminUser: User = {
  id: 'admin-test-123',
  email: 'admin@example.com',
  name: 'Admin User',
  emailVerified: null,
  image: null,
  password: 'hashed-password-admin',
  role: 'admin',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockSession: Session = {
  user: {
    id: mockUser.id,
    email: mockUser.email,
    name: mockUser.name,
    role: mockUser.role as UserRole,
  },
  expires: '2025-12-31T23:59:59.999Z',
};

export const mockAdminSession: Session = {
  user: {
    id: mockAdminUser.id,
    email: mockAdminUser.email,
    name: mockAdminUser.name,
    role: mockAdminUser.role as UserRole,
  },
  expires: '2025-12-31T23:59:59.999Z',
};
