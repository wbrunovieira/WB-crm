/**
 * PartnerActivitiesList Component Tests
 *
 * Tests for src/components/partners/PartnerActivitiesList.tsx — the rich partner
 * timeline that mirrors the lead page but drops cadence/ordering/contact-assignment.
 * - Header count + "Adicionar Atividade" links to the partner
 * - Pending / Concluídas columns split by status
 * - Type filter chips reflect the activity mix
 * - No drag handle (partners have no manual ordering)
 * - Empty state
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PartnerActivitiesList } from "@/components/partners/PartnerActivitiesList";
import type { Activity } from "@/components/leads/activities/activity-types";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { accessToken: "tok", role: "admin" } }, status: "authenticated" }),
}));

// Activity mutation hooks are react-query wrappers; stub them so no QueryClient is needed.
const stubMutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue(undefined) });
vi.mock("@/hooks/activities/use-activities", () => ({
  useToggleActivityCompleted: () => stubMutation(),
  useMarkActivityFailed: () => stubMutation(),
  useMarkActivitySkipped: () => stubMutation(),
  useRevertActivityOutcome: () => stubMutation(),
  useUpdateActivity: () => stubMutation(),
}));

const baseActivity = (over: Partial<Activity> = {}): Activity => ({
  id: "a1",
  type: "task",
  subject: "Ligar para o parceiro",
  description: null,
  dueDate: null,
  completed: false,
  ...over,
});

describe("PartnerActivitiesList", () => {
  it("renders the header count and a partner-scoped add-activity link", () => {
    render(
      <PartnerActivitiesList
        partnerId="p1"
        activities={[baseActivity({ id: "a1" }), baseActivity({ id: "a2", subject: "Enviar proposta" })]}
      />,
    );

    expect(screen.getByText("Atividades (2)")).toBeInTheDocument();
    const addLink = screen.getByRole("link", { name: /Adicionar Atividade/i });
    expect(addLink).toHaveAttribute("href", "/activities/new?partnerId=p1&returnTo=/partners/p1");
  });

  it("splits activities into Pendentes and Concluídas columns", () => {
    render(
      <PartnerActivitiesList
        partnerId="p1"
        activities={[
          baseActivity({ id: "a1", subject: "Pendente aqui" }),
          baseActivity({ id: "a2", subject: "Feita aqui", completed: true, completedAt: new Date("2026-07-01") }),
        ]}
      />,
    );

    // "Pendentes"/"Concluídas" appear both as a status filter chip and as a column header.
    expect(screen.getAllByText("Pendentes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Concluídas").length).toBeGreaterThan(0);
    expect(screen.getByText("Pendente aqui")).toBeInTheDocument();
    expect(screen.getByText("Feita aqui")).toBeInTheDocument();
  });

  it("shows a type filter chip for each activity kind present", () => {
    render(
      <PartnerActivitiesList
        partnerId="p1"
        activities={[
          baseActivity({ id: "a1", type: "call" }),
          baseActivity({ id: "a2", type: "email" }),
        ]}
      />,
    );

    expect(screen.getByText("Ligações")).toBeInTheDocument();
    // "E-mail" shows both as a filter chip and as the activity's type badge.
    expect(screen.getAllByText("E-mail").length).toBeGreaterThan(0);
    // "Total" chip is always present
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("does not render a drag handle (partners have no manual ordering)", () => {
    const { container } = render(
      <PartnerActivitiesList partnerId="p1" activities={[baseActivity()]} />,
    );

    // The drag handle in SortableActivityItem uses the lucide grip-vertical icon.
    expect(container.querySelector(".lucide-grip-vertical")).toBeNull();
  });

  it("renders an empty state when there are no activities", () => {
    render(<PartnerActivitiesList partnerId="p1" activities={[]} />);

    expect(screen.getByText("Atividades (0)")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma atividade registrada ainda.")).toBeInTheDocument();
  });
});
