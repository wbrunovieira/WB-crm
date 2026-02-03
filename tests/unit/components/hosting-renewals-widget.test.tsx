/**
 * Hosting Renewals Widget Tests
 *
 * Tests for src/components/dashboard/HostingRenewalsWidget.tsx
 * - Rendering upcoming renewals
 * - Color coding by urgency
 * - Empty state
 * - Link to organizations
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HostingRenewalsWidget } from '@/components/dashboard/HostingRenewalsWidget';

// Helper to create date X days from now
function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

// Mock data
const mockRenewals = [
  {
    id: 'org-1',
    name: 'Company Urgent',
    hostingRenewalDate: daysFromNow(5),
    hostingPlan: 'Profissional',
    hostingValue: 150,
    hostingReminderDays: 30,
    hostingNotes: null,
    email: 'contact@urgent.com',
    phone: '+55 11 99999-0001',
  },
  {
    id: 'org-2',
    name: 'Company Warning',
    hostingRenewalDate: daysFromNow(12),
    hostingPlan: 'Básico',
    hostingValue: 80,
    hostingReminderDays: 15,
    hostingNotes: 'Renovação automática',
    email: 'contact@warning.com',
    phone: '+55 11 99999-0002',
  },
  {
    id: 'org-3',
    name: 'Company OK',
    hostingRenewalDate: daysFromNow(25),
    hostingPlan: 'Enterprise',
    hostingValue: 299.90,
    hostingReminderDays: 30,
    hostingNotes: null,
    email: null,
    phone: null,
  },
];

describe('HostingRenewalsWidget', () => {
  describe('rendering', () => {
    it('should render widget title', () => {
      render(<HostingRenewalsWidget renewals={mockRenewals} />);

      expect(screen.getByText(/Vencimentos de Hospedagem/i)).toBeInTheDocument();
    });

    it('should render organization names', () => {
      render(<HostingRenewalsWidget renewals={mockRenewals} />);

      expect(screen.getByText('Company Urgent')).toBeInTheDocument();
      expect(screen.getByText('Company Warning')).toBeInTheDocument();
      expect(screen.getByText('Company OK')).toBeInTheDocument();
    });

    it('should render hosting plans', () => {
      render(<HostingRenewalsWidget renewals={mockRenewals} />);

      expect(screen.getByText(/Profissional/)).toBeInTheDocument();
      expect(screen.getByText(/Básico/)).toBeInTheDocument();
      expect(screen.getByText(/Enterprise/)).toBeInTheDocument();
    });

    it('should render renewal dates', () => {
      render(<HostingRenewalsWidget renewals={mockRenewals} />);

      // Dates should be formatted in pt-BR
      const dateElements = screen.getAllByText(/\d{2}\/\d{2}\/\d{4}/);
      expect(dateElements.length).toBeGreaterThan(0);
    });

    it('should render hosting values when available', () => {
      render(<HostingRenewalsWidget renewals={mockRenewals} />);

      expect(screen.getByText(/R\$ 150/)).toBeInTheDocument();
      expect(screen.getByText(/R\$ 80/)).toBeInTheDocument();
      expect(screen.getByText(/R\$ 299/)).toBeInTheDocument();
    });
  });

  describe('urgency colors', () => {
    it('should show red indicator for renewals within 7 days', () => {
      const urgentRenewals = [
        {
          ...mockRenewals[0],
          hostingRenewalDate: daysFromNow(3),
        },
      ];

      render(<HostingRenewalsWidget renewals={urgentRenewals} />);

      // Should have a red/danger indicator class
      const urgentIndicator = screen.getByTestId('urgency-indicator-org-1');
      expect(urgentIndicator).toHaveClass('bg-red-500');
    });

    it('should show yellow indicator for renewals within 15 days', () => {
      const warningRenewals = [
        {
          ...mockRenewals[0],
          id: 'org-warning',
          hostingRenewalDate: daysFromNow(10),
        },
      ];

      render(<HostingRenewalsWidget renewals={warningRenewals} />);

      const warningIndicator = screen.getByTestId('urgency-indicator-org-warning');
      expect(warningIndicator).toHaveClass('bg-yellow-500');
    });

    it('should show green indicator for renewals over 15 days', () => {
      const okRenewals = [
        {
          ...mockRenewals[0],
          id: 'org-ok',
          hostingRenewalDate: daysFromNow(20),
        },
      ];

      render(<HostingRenewalsWidget renewals={okRenewals} />);

      const okIndicator = screen.getByTestId('urgency-indicator-org-ok');
      expect(okIndicator).toHaveClass('bg-green-500');
    });
  });

  describe('empty state', () => {
    it('should show empty message when no renewals', () => {
      render(<HostingRenewalsWidget renewals={[]} />);

      expect(screen.getByText(/Nenhum vencimento próximo/i)).toBeInTheDocument();
    });

    it('should not show empty message when has renewals', () => {
      render(<HostingRenewalsWidget renewals={mockRenewals} />);

      expect(screen.queryByText(/Nenhum vencimento próximo/i)).not.toBeInTheDocument();
    });
  });

  describe('links', () => {
    it('should have link to organization details', () => {
      render(<HostingRenewalsWidget renewals={mockRenewals} />);

      const links = screen.getAllByRole('link');
      const orgLinks = links.filter(link =>
        link.getAttribute('href')?.includes('/organizations/')
      );

      expect(orgLinks.length).toBe(3);
    });

    it('should link to correct organization', () => {
      render(<HostingRenewalsWidget renewals={[mockRenewals[0]]} />);

      const link = screen.getByRole('link', { name: /Company Urgent/i });
      expect(link).toHaveAttribute('href', '/organizations/org-1');
    });
  });

  describe('days until renewal', () => {
    it('should show days remaining', () => {
      const renewals = [
        {
          ...mockRenewals[0],
          hostingRenewalDate: daysFromNow(5),
        },
      ];

      render(<HostingRenewalsWidget renewals={renewals} />);

      expect(screen.getByText(/5 dias/i)).toBeInTheDocument();
    });

    it('should show singular "dia" for 1 day', () => {
      const renewals = [
        {
          ...mockRenewals[0],
          hostingRenewalDate: daysFromNow(1),
        },
      ];

      render(<HostingRenewalsWidget renewals={renewals} />);

      expect(screen.getByText(/1 dia/i)).toBeInTheDocument();
    });

    it('should show "Hoje" for renewal today', () => {
      const renewals = [
        {
          ...mockRenewals[0],
          hostingRenewalDate: new Date(),
        },
      ];

      render(<HostingRenewalsWidget renewals={renewals} />);

      expect(screen.getByText(/Hoje/i)).toBeInTheDocument();
    });
  });
});
