/**
 * WonDealsList Component Tests
 *
 * Tests for src/components/admin/manager/WonDealsList.tsx — the list of deals actually
 * WON in the selected period (closedAt-based), shown under the Manager Dashboard's
 * deals chart so a weekly result can be checked deal by deal, not just as a figure.
 * - Renders one row per won deal with its title, closed date and value
 * - Sums the period total, splitting per currency (deals are multi-currency)
 * - Renders an empty state when nothing was won
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { WonDealsList } from "@/components/admin/manager/WonDealsList";
import type { WonDealSummary } from "@/types/admin-manager";

const DEALS: WonDealSummary[] = [
  {
    id: "deal-1",
    title: "Site + Sistema de Agendamento - Gomez Studio",
    value: 2500,
    currency: "BRL",
    closedAt: "2026-08-25T13:21:21.000Z",
  },
  {
    id: "deal-2",
    title: "Site Padaria Rainha da Massa",
    value: 390,
    currency: "BRL",
    closedAt: "2026-08-26T16:46:06.000Z",
  },
];

describe("WonDealsList", () => {
  it("renderiza uma linha por negócio ganho, com título e valor", () => {
    render(<WonDealsList wonDeals={DEALS} />);

    expect(
      screen.getByText("Site + Sistema de Agendamento - Gomez Studio")
    ).toBeInTheDocument();
    expect(screen.getByText("Site Padaria Rainha da Massa")).toBeInTheDocument();
    expect(screen.getByText("R$ 2.500,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 390,00")).toBeInTheDocument();
  });

  it("linka cada negócio para a sua página de detalhe", () => {
    render(<WonDealsList wonDeals={DEALS} />);

    const link = screen.getByRole("link", {
      name: "Site Padaria Rainha da Massa",
    });
    expect(link).toHaveAttribute("href", "/deals/deal-2");
  });

  it("soma o total do período", () => {
    render(<WonDealsList wonDeals={DEALS} />);

    expect(screen.getByText("R$ 2.890,00")).toBeInTheDocument();
  });

  it("separa o total por moeda quando há mais de uma", () => {
    render(
      <WonDealsList
        wonDeals={[
          ...DEALS,
          {
            id: "deal-3",
            title: "Landing page internacional",
            value: 800,
            currency: "USD",
            closedAt: "2026-08-27T10:00:00.000Z",
          },
        ]}
      />
    );

    // BRL and USD must not be added into a single meaningless figure.
    expect(screen.getByText("R$ 2.890,00")).toBeInTheDocument();
    // The lone USD deal's row value and the USD total are the same figure, so it appears
    // twice: once in the row, once in the footer.
    expect(screen.getAllByText(/US\$\s?800,00/)).toHaveLength(2);
  });

  it("mostra o estado vazio quando nada foi ganho no período", () => {
    render(<WonDealsList wonDeals={[]} />);

    expect(
      screen.getByText("Nenhum negócio ganho no período")
    ).toBeInTheDocument();
  });
});
