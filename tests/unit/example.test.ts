import { describe, it, expect } from 'vitest';

describe('Setup Validation', () => {
  it('should run a simple test', () => {
    expect(true).toBe(true);
  });

  it('should perform basic arithmetic', () => {
    expect(2 + 2).toBe(4);
  });

  it('should handle string operations', () => {
    const message = 'Hello Vitest';
    expect(message).toContain('Vitest');
    expect(message).toHaveLength(12);
  });

  it('should work with arrays', () => {
    const numbers = [1, 2, 3, 4, 5];
    expect(numbers).toHaveLength(5);
    expect(numbers).toContain(3);
  });

  it('should work with objects', () => {
    const user = {
      id: '123',
      name: 'Test User',
      email: 'test@example.com',
    };

    expect(user).toHaveProperty('id');
    expect(user.name).toBe('Test User');
    expect(user).toMatchObject({
      id: '123',
      email: 'test@example.com',
    });
  });
});
