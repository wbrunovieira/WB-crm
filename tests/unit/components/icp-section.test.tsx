/**
 * EntityICPSection Component Tests
 *
 * Tests for src/components/icps/EntityICPSection.tsx — the generic ICP section
 * that backs the thin LeadICPSection / PartnerICPSection / OrganizationICPSection
 * wrappers. All three share this body; only hooks, id-param and pt-BR copy differ.
 * - Renders the "Perfis de Cliente Ideal (ICPs)" heading (standardized lead look)
 * - Renders a linked-ICP row (name, fit badge, match score)
 * - Renders the entity-specific empty state when there are no links
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  EntityICPSection,
  type EntityICPLabels,
  type EntityICPLink,
} from "@/components/icps/EntityICPSection";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { accessToken: "tok", role: "admin" } }, status: "authenticated" }),
}));

// The generic pulls the shared "available ICPs" list from this hook; stub it so
// no QueryClient/network is needed. The per-entity link/mutation hooks are
// injected via props, so they are stubbed inline below.
vi.mock("@/hooks/icps/use-icps", () => ({
  useICPs: () => ({ data: [], isLoading: false }),
}));

const stubMutation = () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false });

const LABELS: EntityICPLabels = {
  emptyState: "Nenhum ICP vinculado a este lead.",
  notesTip: "Notas adicionais sobre o lead",
  fitStatusTip: "Quão bem o lead se encaixa no perfil ideal",
  businessMomentTip: "Em qual fase do negócio o lead está",
  platformsTip: "Quais plataformas o lead usa atualmente",
  strategicDesireTip: "O que o lead deseja alcançar estrategicamente",
  painTip: "Principal dor/problema declarado pelo lead",
  fragmentationTip: "Quão fragmentada está a operação do lead",
  purchaseTriggerTip: "O que motivou o lead a buscar uma solução agora",
  decisionTimeTip: "Estimativa de quando o lead vai tomar a decisão",
  complexityTip: "Complexidade técnica percebida da implementação (1=simples, 5=muito complexa)",
};

const linkedHooks = (links: EntityICPLink[]) => ({
  useLinks: () => ({ data: links, isLoading: false }),
  useLink: stubMutation,
  useUpdate: stubMutation,
  useUnlink: stubMutation,
});

const fakeLink = (over: Partial<EntityICPLink> = {}): EntityICPLink => ({
  icpId: "icp-1",
  icp: { id: "icp-1", name: "Infoprodutores", slug: "infoprodutores", status: "active" },
  matchScore: 85,
  icpFitStatus: "ideal",
  ...over,
});

describe("EntityICPSection", () => {
  it("renders the section heading and a linked-ICP row", () => {
    render(
      <EntityICPSection
        entityId="lead-1"
        idParam={{ leadId: "lead-1" }}
        labels={LABELS}
        hooks={linkedHooks([fakeLink()])}
      />,
    );

    expect(screen.getByText("Perfis de Cliente Ideal (ICPs)")).toBeInTheDocument();
    // Linked ICP name links to the admin ICP page
    const icpLink = screen.getByRole("link", { name: "Infoprodutores" });
    expect(icpLink).toHaveAttribute("href", "/admin/icps/icp-1");
    // Fit badge + match score render
    expect(screen.getByText("Ideal")).toBeInTheDocument();
    expect(screen.getByText("85% match")).toBeInTheDocument();
  });

  it("renders the entity-specific empty state when no ICPs are linked", () => {
    render(
      <EntityICPSection
        entityId="lead-1"
        idParam={{ leadId: "lead-1" }}
        labels={LABELS}
        hooks={linkedHooks([])}
      />,
    );

    expect(screen.getByText(/Nenhum ICP vinculado a este lead\./)).toBeInTheDocument();
  });

  it("threads a non-lead idParam into the update mutation payload", async () => {
    const updateMock = vi.fn().mockResolvedValue(undefined);
    render(
      <EntityICPSection
        entityId="p1"
        idParam={{ partnerId: "p1" }}
        labels={LABELS}
        hooks={{
          useLinks: () => ({ data: [fakeLink()], isLoading: false }),
          useLink: stubMutation,
          useUpdate: () => ({ mutateAsync: updateMock, isPending: false }),
          useUnlink: stubMutation,
        }}
      />,
    );

    fireEvent.click(screen.getByTitle("Editar categorização")); // expand the linked ICP
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ partnerId: "p1", icpId: "icp-1" }),
      ),
    );
  });
});
