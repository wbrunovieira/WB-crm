/**
 * ForecastDealsList Component Tests
 *
 * Tests for src/components/admin/manager/ForecastDealsList.tsx — the still-OPEN deals
 * expected to close in the selected period, so "prospectar mais ou focar nos fechamentos"
 * can be decided from the pipeline rather than from deals created in the period.
 * - Renders one row per forecast deal with stage, expected date and value, soonest first
 * - Surfaces overdue and undated pipeline, which the in-period list alone would hide
 * - Renders an empty state that still reports what falls outside the period
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ForecastDealsList } from "@/components/admin/manager/ForecastDealsList";
import type { DealsForecast } from "@/types/admin-manager";

const FORECAST: DealsForecast = {
  deals: [
    {
      id: "deal-1",
      title: "Site Charles Rodas e Pneus",
      value: 480,
      currency: "BRL",
      expectedCloseDate: "2026-09-04T00:00:00.000Z",
      stageName: "Proposta",
    },
    {
      id: "deal-2",
      title: "Website Crochê com Raquel",
      value: 350,
      currency: "BRL",
      expectedCloseDate: "2026-09-04T00:00:00.000Z",
      stageName: "Qualificação",
    },
  ],
  totalValue: 830,
  overdue: { count: 1, value: 350 },
  withoutDate: { count: 9, value: 4060 },
};

describe("ForecastDealsList", () => {
  it("renderiza cada negócio previsto com etapa e valor", () => {
    render(<ForecastDealsList forecast={FORECAST} />);

    expect(screen.getByText("Site Charles Rodas e Pneus")).toBeInTheDocument();
    expect(screen.getByText("Website Crochê com Raquel")).toBeInTheDocument();
    expect(screen.getByText("Proposta")).toBeInTheDocument();
    expect(screen.getByText("R$ 480,00")).toBeInTheDocument();
  });

  it("linka cada negócio para a sua página de detalhe", () => {
    render(<ForecastDealsList forecast={FORECAST} />);

    expect(
      screen.getByRole("link", { name: "Website Crochê com Raquel" })
    ).toHaveAttribute("href", "/deals/deal-2");
  });

  it("mostra o total previsto do período", () => {
    render(<ForecastDealsList forecast={FORECAST} />);

    expect(screen.getByText("R$ 830,00")).toBeInTheDocument();
  });

  it("avisa sobre pipeline atrasado e sem data prevista", () => {
    render(<ForecastDealsList forecast={FORECAST} />);

    // Both are invisible in the in-period list, yet they change the "prospect vs close"
    // call — an overdue deal is a closing opportunity, an undated one is unplanned revenue.
    const notes = screen.getByTestId("forecast-notes");
    expect(within(notes).getByText(/1 atrasado/)).toBeInTheDocument();
    expect(within(notes).getByText(/9 sem data prevista/)).toBeInTheDocument();
  });

  it("no plural correto quando há mais de um atrasado", () => {
    render(
      <ForecastDealsList
        forecast={{ ...FORECAST, overdue: { count: 3, value: 900 } }}
      />
    );

    expect(screen.getByText(/3 atrasados/)).toBeInTheDocument();
  });

  it("estado vazio ainda reporta o que está fora do período", () => {
    render(<ForecastDealsList forecast={{ ...FORECAST, deals: [], totalValue: 0 }} />);

    expect(
      screen.getByText("Nenhum negócio previsto para o período")
    ).toBeInTheDocument();
    expect(screen.getByText(/9 sem data prevista/)).toBeInTheDocument();
  });
});
