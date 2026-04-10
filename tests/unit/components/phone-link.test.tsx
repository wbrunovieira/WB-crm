/**
 * PhoneLink Component Tests
 *
 * Tests for src/components/ui/phone-link.tsx
 * - Renderização do link tel:
 * - Formatação de número para E.164 no href
 * - Exibição formatada para o usuário
 * - Sanitização de caracteres especiais
 * - Tratamento de valores nulos/vazios
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PhoneLink } from '@/components/ui/phone-link';

describe('PhoneLink', () => {
  describe('renderização básica', () => {
    it('deve renderizar um link com href tel:', () => {
      render(<PhoneLink phone="+5511999999999" />);

      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link.getAttribute('href')).toMatch(/^tel:/);
    });

    it('não deve renderizar nada quando phone é null', () => {
      const { container } = render(<PhoneLink phone={null} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('não deve renderizar nada quando phone é undefined', () => {
      const { container } = render(<PhoneLink phone={undefined} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('não deve renderizar nada quando phone é string vazia', () => {
      const { container } = render(<PhoneLink phone="" />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('formatação do href (E.164)', () => {
    it('deve manter número já em E.164 no href', () => {
      render(<PhoneLink phone="+5511999999999" />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'tel:+5511999999999');
    });

    it('deve manter número com código do país no href sem duplicar', () => {
      render(<PhoneLink phone="+5511987654321" />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'tel:+5511987654321');
    });

    it('deve remover formatação (parênteses, traços, espaços) do href', () => {
      render(<PhoneLink phone="(11) 99999-9999" />);

      const link = screen.getByRole('link');
      // href deve conter apenas dígitos e o prefixo tel:
      const href = link.getAttribute('href') ?? '';
      const digits = href.replace('tel:', '').replace('+', '');
      expect(digits).toMatch(/^\d+$/);
    });

    it('deve remover espaços do href', () => {
      render(<PhoneLink phone="11 99999 9999" />);

      const link = screen.getByRole('link');
      const href = link.getAttribute('href') ?? '';
      expect(href).not.toContain(' ');
    });
  });

  describe('texto exibido ao usuário', () => {
    it('deve exibir o número como fornecido quando já formatado', () => {
      render(<PhoneLink phone="(11) 99999-9999" />);

      const link = screen.getByRole('link');
      expect(link).toHaveTextContent('(11) 99999-9999');
    });

    it('deve exibir o número em E.164 quando fornecido em E.164', () => {
      render(<PhoneLink phone="+5511999999999" />);

      const link = screen.getByRole('link');
      expect(link).toHaveTextContent('+5511999999999');
    });
  });

  describe('ícone de telefone', () => {
    it('deve renderizar ícone de telefone por padrão', () => {
      render(<PhoneLink phone="+5511999999999" />);

      // O ícone é um SVG do lucide-react
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('não deve renderizar ícone quando showIcon=false', () => {
      render(<PhoneLink phone="+5511999999999" showIcon={false} />);

      const svg = document.querySelector('svg');
      expect(svg).not.toBeInTheDocument();
    });
  });

  describe('className customizável', () => {
    it('deve aplicar className customizado no link', () => {
      render(<PhoneLink phone="+5511999999999" className="text-red-500" />);

      const link = screen.getByRole('link');
      expect(link).toHaveClass('text-red-500');
    });
  });
});
