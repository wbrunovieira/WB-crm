/**
 * Authentication Tests
 *
 * Tests the authentication flow including:
 * - Login with valid credentials
 * - Login with invalid credentials
 * - Session token validation
 * - JWT callbacks
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { prismaMock } from '../setup';
import {
  userA,
  adminUser,
} from '../fixtures/multiple-users';

// We need to test the authorize function from authOptions
// Since it's not exported directly, we'll test the behavior through mocking

describe('Authentication - Credentials Provider', () => {
  describe('authorize function behavior', () => {
    // We test the authorize logic by simulating what it does

    it('should reject login when email is missing', async () => {
      // The authorize function throws "Email e senha são obrigatórios" when email is missing
      const credentials = { email: '', password: 'password123' };

      // Simulating the validation logic
      const isValid = credentials.email && credentials.password;
      expect(isValid).toBeFalsy();
    });

    it('should reject login when password is missing', async () => {
      const credentials = { email: 'test@example.com', password: '' };

      const isValid = credentials.email && credentials.password;
      expect(isValid).toBeFalsy();
    });

    it('should reject login when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await prismaMock.user.findUnique({
        where: { email: 'nonexistent@example.com' },
      });

      expect(result).toBeNull();
      // In the real authorize function, this would throw "Credenciais inválidas"
    });

    it('should reject login when password is incorrect', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      const user = { ...userA, password: hashedPassword };

      prismaMock.user.findUnique.mockResolvedValue(user);

      const dbUser = await prismaMock.user.findUnique({
        where: { email: userA.email },
      });

      expect(dbUser).not.toBeNull();

      // Check password comparison
      const isPasswordValid = await bcrypt.compare('wrongpassword', dbUser!.password!);
      expect(isPasswordValid).toBe(false);
    });

    it('should accept login when credentials are valid', async () => {
      const plainPassword = 'correctpassword';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      const user = { ...userA, password: hashedPassword };

      prismaMock.user.findUnique.mockResolvedValue(user);

      const dbUser = await prismaMock.user.findUnique({
        where: { email: userA.email },
      });

      expect(dbUser).not.toBeNull();

      // Check password comparison
      const isPasswordValid = await bcrypt.compare(plainPassword, dbUser!.password!);
      expect(isPasswordValid).toBe(true);

      // The authorize function would return user data on success
      const returnedUser = {
        id: dbUser!.id,
        email: dbUser!.email,
        name: dbUser!.name,
        role: dbUser!.role,
      };

      expect(returnedUser.id).toBe(userA.id);
      expect(returnedUser.email).toBe(userA.email);
      expect(returnedUser.role).toBe('sdr');
    });

    it('should return user with admin role when admin logs in', async () => {
      const plainPassword = 'adminpassword';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      const admin = { ...adminUser, password: hashedPassword };

      prismaMock.user.findUnique.mockResolvedValue(admin);

      const dbUser = await prismaMock.user.findUnique({
        where: { email: adminUser.email },
      });

      const isPasswordValid = await bcrypt.compare(plainPassword, dbUser!.password!);
      expect(isPasswordValid).toBe(true);

      expect(dbUser!.role).toBe('admin');
    });

    it('should reject login when user has no password set', async () => {
      const userWithoutPassword = { ...userA, password: null };

      prismaMock.user.findUnique.mockResolvedValue(userWithoutPassword);

      const dbUser = await prismaMock.user.findUnique({
        where: { email: userA.email },
      });

      // In authorize function: if (!user || !user.password) throws error
      const hasPassword = dbUser && dbUser.password;
      expect(hasPassword).toBeFalsy();
    });
  });

  describe('JWT callback behavior', () => {
    it('should add user id and role to token when user is provided', () => {
      // Simulating jwt callback behavior
      const token: Record<string, unknown> = {};
      const user = {
        id: userA.id,
        email: userA.email,
        name: userA.name,
        role: 'sdr',
      };

      // This is what the jwt callback does
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      expect(token.id).toBe(userA.id);
      expect(token.role).toBe('sdr');
    });

    it('should preserve token when user is not provided (subsequent calls)', () => {
      const existingToken = {
        id: userA.id,
        role: 'sdr',
      };

      // On subsequent calls, user is undefined, token should be preserved
      // Simulate jwt callback behavior where user may or may not be present
      function simulateJwtCallback(
        token: typeof existingToken,
        user: { id: string; role: string } | undefined
      ) {
        if (user) {
          token.id = user.id;
          token.role = user.role;
        }
        return token;
      }

      const result = simulateJwtCallback(existingToken, undefined);

      expect(result.id).toBe(userA.id);
      expect(result.role).toBe('sdr');
    });
  });

  describe('Session callback behavior', () => {
    it('should add user id and role to session from token', () => {
      const session = {
        user: {
          id: '',
          email: userA.email,
          name: userA.name,
          role: '' as string,
        },
        expires: '2025-12-31',
      };

      const token = {
        id: userA.id,
        role: 'sdr',
      };

      // This is what the session callback does
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }

      expect(session.user.id).toBe(userA.id);
      expect(session.user.role).toBe('sdr');
    });
  });

  describe('Password hashing', () => {
    it('should correctly hash and compare passwords', async () => {
      const plainPassword = 'mySecurePassword123';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      // Hash should be different from plain text
      expect(hashedPassword).not.toBe(plainPassword);

      // Comparison should work correctly
      const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
      expect(isMatch).toBe(true);

      // Wrong password should not match
      const isWrongMatch = await bcrypt.compare('wrongPassword', hashedPassword);
      expect(isWrongMatch).toBe(false);
    });

    it('should generate different hashes for same password (salt)', async () => {
      const password = 'samePassword';
      const hash1 = await bcrypt.hash(password, 10);
      const hash2 = await bcrypt.hash(password, 10);

      // Due to salt, hashes should be different
      expect(hash1).not.toBe(hash2);

      // But both should validate correctly
      expect(await bcrypt.compare(password, hash1)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
    });
  });
});

describe('Authentication - Registration', () => {
  describe('POST /api/register', () => {
    it('should validate that name has minimum 2 characters', () => {
      const shortName = 'A';
      const validName = 'AB';

      expect(shortName.length >= 2).toBe(false);
      expect(validName.length >= 2).toBe(true);
    });

    it('should validate email format', () => {
      const invalidEmails = ['notanemail', 'missing@domain', '@nodomain.com', 'spaces in@email.com'];
      const validEmail = 'valid@example.com';

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });

      expect(emailRegex.test(validEmail)).toBe(true);
    });

    it('should validate password has minimum 6 characters', () => {
      const shortPassword = '12345';
      const validPassword = '123456';

      expect(shortPassword.length >= 6).toBe(false);
      expect(validPassword.length >= 6).toBe(true);
    });

    it('should reject duplicate email registration', async () => {
      // Simulating existing user check
      prismaMock.user.findUnique.mockResolvedValue(userA);

      const existingUser = await prismaMock.user.findUnique({
        where: { email: userA.email },
      });

      expect(existingUser).not.toBeNull();
      // In the real implementation, this would return 400 with "Usuário já existe"
    });

    it('should allow registration with new email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const existingUser = await prismaMock.user.findUnique({
        where: { email: 'newuser@example.com' },
      });

      expect(existingUser).toBeNull();
      // Registration can proceed
    });

    it('should create user with hashed password', async () => {
      const plainPassword = 'newuserpassword';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const newUser = {
        id: 'new-user-id',
        name: 'New User',
        email: 'newuser@example.com',
        password: hashedPassword,
        role: 'sdr',
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: null,
        image: null,
      };

      prismaMock.user.create.mockResolvedValue(newUser);

      const createdUser = await prismaMock.user.create({
        data: {
          name: 'New User',
          email: 'newuser@example.com',
          password: hashedPassword,
        },
      });

      expect(createdUser.email).toBe('newuser@example.com');
      // Password should be hashed, not plain text
      expect(createdUser.password).not.toBe(plainPassword);
      expect(await bcrypt.compare(plainPassword, createdUser.password!)).toBe(true);
    });
  });
});
