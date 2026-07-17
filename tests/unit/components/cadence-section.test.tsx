/**
 * EntityCadenceSection Component Tests
 *
 * Tests for src/components/shared/cadence/EntityCadenceSection.tsx — the generic
 * cadence section that backs the thin LeadCadenceSection / PartnerCadenceSection
 * wrappers. Both share this body; only the entity path segment, the pause/resume/
 * cancel hooks, the mutationArg builder and pt-BR copy differ.
 * - Renders the "Cadências de Prospecção" heading + an active cadence row
 * - Renders the entity-specific empty state when there are no cadences
 * - Threads a non-lead (partner) mutationArg into the pause mutation payload
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { apiFetch } from "@/lib/api-client";
import {
  EntityCadenceSection,
  type EntityCadence,
} from "@/components/shared/cadence/EntityCadenceSection";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { accessToken: "tok", role: "admin" } }, status: "authenticated" }),
}));

// The section loads its cadence list via apiFetch in a useEffect; stub it so no
// network/QueryClient is needed. The pause/resume/cancel hooks are injected via
// props, so they are stubbed inline per test.
vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

const apiFetchMock = apiFetch as unknown as Mock;

const stubMutation = () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) });

const LEAD_LABELS = {
  emptyState: "Nenhuma cadência aplicada a este lead.",
  resumeMessage: "Retomar esta cadência? As datas das atividades pendentes serão ajustadas.",
};

const PARTNER_LABELS = {
  emptyState: "Nenhuma cadência aplicada a este parceiro.",
  resumeMessage: "Retomar esta cadência?",
};

const activeCadence = (over: Partial<EntityCadence> = {}): EntityCadence => ({
  id: "lc-1",
  cadenceId: "cad-1",
  status: "active",
  startDate: "2026-01-10T00:00:00.000Z",
  cadence: { name: "Cadência Padrão", slug: "cadencia-padrao", durationDays: 14, icp: null },
  activities: [],
  progress: 0,
  completedSteps: 0,
  totalSteps: 5,
  ...over,
});

beforeEach(() => {
  apiFetchMock.mockReset();
});

describe("EntityCadenceSection", () => {
  it("renders the section heading and an active cadence row", async () => {
    apiFetchMock.mockResolvedValue([activeCadence()]);

    render(
      <EntityCadenceSection
        entityId="lead-1"
        entity="lead"
        labels={LEAD_LABELS}
        hooks={{ usePause: stubMutation, useResume: stubMutation, useCancel: stubMutation }}
        mutationArg={(id) => ({ leadCadenceId: id, leadId: "lead-1" })}
        renderModal={() => null}
      />,
    );

    expect(await screen.findByText("Cadência Padrão")).toBeInTheDocument();
    expect(screen.getByText("Cadências de Prospecção")).toBeInTheDocument();
    // List fetch hits the entity-scoped endpoint
    expect(apiFetchMock).toHaveBeenCalledWith("/cadences/lead/lead-1", "tok");
  });

  it("renders the entity-specific empty state when no cadences exist", async () => {
    apiFetchMock.mockResolvedValue([]);

    render(
      <EntityCadenceSection
        entityId="p1"
        entity="partner"
        labels={PARTNER_LABELS}
        hooks={{ usePause: stubMutation, useResume: stubMutation, useCancel: stubMutation }}
        mutationArg={(id) => ({ partnerCadenceId: id, partnerId: "p1" })}
        renderModal={() => null}
      />,
    );

    expect(
      await screen.findByText("Nenhuma cadência aplicada a este parceiro."),
    ).toBeInTheDocument();
  });

  it("threads a non-lead (partner) mutationArg into the pause mutation payload", async () => {
    apiFetchMock.mockResolvedValue([activeCadence()]);
    const pauseMock = vi.fn().mockResolvedValue(undefined);

    render(
      <EntityCadenceSection
        entityId="p1"
        entity="partner"
        labels={PARTNER_LABELS}
        hooks={{
          usePause: () => ({ mutateAsync: pauseMock }),
          useResume: stubMutation,
          useCancel: stubMutation,
        }}
        mutationArg={(id) => ({ partnerCadenceId: id, partnerId: "p1" })}
        renderModal={() => null}
      />,
    );

    // Wait for the active cadence to render, then open the pause confirm dialog.
    await screen.findByText("Cadência Padrão");
    fireEvent.click(screen.getByTitle("Pausar")); // pause icon button
    fireEvent.click(screen.getByText("Pausar")); // confirm-dialog button

    await waitFor(() =>
      expect(pauseMock).toHaveBeenCalledWith({ partnerCadenceId: "lc-1", partnerId: "p1" }),
    );
  });
});
