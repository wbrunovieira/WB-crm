import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prismaMock } from '../../setup';
import { mockSession } from '../../fixtures/users';

const mockedGetServerSession = vi.mocked(getServerSession);

// ============ VALIDATION TESTS ============

describe('Language validation', () => {
  it('should accept empty/null languages', async () => {
    const { validateLanguages } = await import('@/lib/validations/languages');
    expect(validateLanguages(null)).toEqual(null);
    expect(validateLanguages(undefined)).toEqual(null);
    expect(validateLanguages([])).toEqual(null);
  });

  it('should accept a single language (auto-primary)', async () => {
    const { validateLanguages } = await import('@/lib/validations/languages');
    const result = validateLanguages([{ code: 'pt-BR', isPrimary: false }]);
    expect(result).toEqual([{ code: 'pt-BR', isPrimary: true }]);
  });

  it('should require exactly one primary when multiple languages', async () => {
    const { validateLanguages } = await import('@/lib/validations/languages');
    expect(() =>
      validateLanguages([
        { code: 'pt-BR', isPrimary: false },
        { code: 'en', isPrimary: false },
      ])
    ).toThrow('Um idioma deve ser marcado como principal');
  });

  it('should reject multiple primaries', async () => {
    const { validateLanguages } = await import('@/lib/validations/languages');
    expect(() =>
      validateLanguages([
        { code: 'pt-BR', isPrimary: true },
        { code: 'en', isPrimary: true },
      ])
    ).toThrow('Apenas um idioma pode ser o principal');
  });

  it('should accept valid multiple languages with one primary', async () => {
    const { validateLanguages } = await import('@/lib/validations/languages');
    const result = validateLanguages([
      { code: 'pt-BR', isPrimary: true },
      { code: 'en', isPrimary: false },
      { code: 'es', isPrimary: false },
    ]);
    expect(result).toEqual([
      { code: 'pt-BR', isPrimary: true },
      { code: 'en', isPrimary: false },
      { code: 'es', isPrimary: false },
    ]);
  });

  it('should reject duplicate language codes', async () => {
    const { validateLanguages } = await import('@/lib/validations/languages');
    expect(() =>
      validateLanguages([
        { code: 'pt-BR', isPrimary: true },
        { code: 'pt-BR', isPrimary: false },
      ])
    ).toThrow('Idiomas duplicados não são permitidos');
  });

  it('should reject invalid language codes', async () => {
    const { validateLanguages } = await import('@/lib/validations/languages');
    expect(() =>
      validateLanguages([{ code: 'xyz', isPrimary: true }])
    ).toThrow();
  });
});

// ============ LEAD CONTACT LANGUAGE TESTS ============

describe('LeadContact languages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetServerSession.mockResolvedValue(mockSession);
  });

  it('should create lead contact with languages', async () => {
    const { createLeadContact } = await import('@/actions/leads');

    prismaMock.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      ownerId: 'user-test-123',
    } as never);

    prismaMock.leadContact.updateMany.mockResolvedValue({ count: 0 } as never);

    prismaMock.leadContact.create.mockResolvedValue({
      id: 'lc-1',
      leadId: 'lead-1',
      name: 'João',
      languages: JSON.stringify([{ code: 'pt-BR', isPrimary: true }]),
    } as never);

    const result = await createLeadContact('lead-1', {
      name: 'João',
      languages: [{ code: 'pt-BR', isPrimary: true }],
    });

    expect(prismaMock.leadContact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        languages: JSON.stringify([{ code: 'pt-BR', isPrimary: true }]),
      }),
    });
  });

  it('should update lead contact with languages', async () => {
    const { updateLeadContact } = await import('@/actions/leads');

    prismaMock.leadContact.findUnique.mockResolvedValue({
      id: 'lc-1',
      leadId: 'lead-1',
      isPrimary: false,
      lead: { id: 'lead-1', ownerId: 'user-test-123' },
    } as never);

    prismaMock.leadContact.update.mockResolvedValue({
      id: 'lc-1',
      languages: JSON.stringify([
        { code: 'pt-BR', isPrimary: true },
        { code: 'en', isPrimary: false },
      ]),
    } as never);

    await updateLeadContact('lc-1', {
      name: 'João',
      languages: [
        { code: 'pt-BR', isPrimary: true },
        { code: 'en', isPrimary: false },
      ],
    });

    expect(prismaMock.leadContact.update).toHaveBeenCalledWith({
      where: { id: 'lc-1' },
      data: expect.objectContaining({
        languages: JSON.stringify([
          { code: 'pt-BR', isPrimary: true },
          { code: 'en', isPrimary: false },
        ]),
      }),
    });
  });

  it('should save null when no languages provided', async () => {
    const { createLeadContact } = await import('@/actions/leads');

    prismaMock.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      ownerId: 'user-test-123',
    } as never);

    prismaMock.leadContact.updateMany.mockResolvedValue({ count: 0 } as never);

    prismaMock.leadContact.create.mockResolvedValue({
      id: 'lc-1',
      leadId: 'lead-1',
      name: 'João',
      languages: null,
    } as never);

    await createLeadContact('lead-1', {
      name: 'João',
    });

    expect(prismaMock.leadContact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        languages: null,
      }),
    });
  });
});

// ============ LEAD LANGUAGE TESTS ============

describe('Lead languages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetServerSession.mockResolvedValue(mockSession);
  });

  it('should update lead with languages', async () => {
    const { updateLead } = await import('@/actions/leads');

    prismaMock.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      ownerId: 'user-test-123',
    } as never);

    prismaMock.lead.update.mockResolvedValue({
      id: 'lead-1',
      languages: JSON.stringify([{ code: 'en', isPrimary: true }]),
    } as never);

    await updateLead('lead-1', {
      businessName: 'Test Co',
      languages: [{ code: 'en', isPrimary: true }],
    });

    expect(prismaMock.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          languages: JSON.stringify([{ code: 'en', isPrimary: true }]),
        }),
      })
    );
  });
});

// ============ HELPER: parseLanguages ============

describe('parseLanguages helper', () => {
  it('should parse valid JSON string', async () => {
    const { parseLanguages } = await import('@/lib/validations/languages');
    const result = parseLanguages(JSON.stringify([{ code: 'pt-BR', isPrimary: true }]));
    expect(result).toEqual([{ code: 'pt-BR', isPrimary: true }]);
  });

  it('should return empty array for null', async () => {
    const { parseLanguages } = await import('@/lib/validations/languages');
    expect(parseLanguages(null)).toEqual([]);
  });

  it('should return empty array for invalid JSON', async () => {
    const { parseLanguages } = await import('@/lib/validations/languages');
    expect(parseLanguages('invalid')).toEqual([]);
  });

  it('should return primary language label', async () => {
    const { getPrimaryLanguageLabel } = await import('@/lib/validations/languages');
    expect(getPrimaryLanguageLabel(JSON.stringify([
      { code: 'en', isPrimary: true },
      { code: 'pt-BR', isPrimary: false },
    ]))).toBe('English');
  });

  it('should return null when no languages', async () => {
    const { getPrimaryLanguageLabel } = await import('@/lib/validations/languages');
    expect(getPrimaryLanguageLabel(null)).toBeNull();
  });
});
