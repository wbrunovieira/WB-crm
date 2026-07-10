/**
 * PartnerContactsList Component Tests
 *
 * Tests for src/components/partners/PartnerContactsList.tsx
 * - Rendering the contact rows and count
 * - Primary / inactive badges
 * - Channel badges driven by available fields
 * - Quick-action buttons (WhatsApp / Gmail) gated on whatsapp/email
 * - Empty state
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PartnerContactsList } from "@/components/partners/PartnerContactsList";
import type { PartnerContact } from "@/types/partner";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { accessToken: "tok" } }, status: "authenticated" }),
}));

const baseContact = (over: Partial<PartnerContact> = {}): PartnerContact => ({
  id: "c1",
  name: "Ana Souza",
  email: null,
  phone: null,
  position: null,
  role: null,
  whatsapp: null,
  linkedin: null,
  instagram: null,
  isPrimary: false,
  status: "active",
  ...over,
});

describe("PartnerContactsList", () => {
  it("renders the header count and each contact name", () => {
    render(
      <PartnerContactsList
        partnerId="p1"
        partnerName="Agência X"
        contacts={[baseContact({ id: "c1", name: "Ana Souza" }), baseContact({ id: "c2", name: "Bruno Lima" })]}
      />,
    );

    expect(screen.getByText("Contatos (2)")).toBeInTheDocument();
    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByText("Bruno Lima")).toBeInTheDocument();
  });

  it("shows the Principal badge only for the primary contact", () => {
    render(
      <PartnerContactsList
        partnerId="p1"
        partnerName="Agência X"
        contacts={[baseContact({ isPrimary: true })]}
      />,
    );

    expect(screen.getByText("Principal")).toBeInTheDocument();
  });

  it("marks an inactive contact as Desativado with a line-through name", () => {
    render(
      <PartnerContactsList
        partnerId="p1"
        partnerName="Agência X"
        contacts={[baseContact({ name: "Inativo Zé", status: "inactive" })]}
      />,
    );

    expect(screen.getByText("Desativado")).toBeInTheDocument();
    expect(screen.getByText("Inativo Zé").className).toContain("line-through");
  });

  it("renders channel badges based on the available fields", () => {
    render(
      <PartnerContactsList
        partnerId="p1"
        partnerName="Agência X"
        contacts={[
          baseContact({
            email: "ana@x.com",
            whatsapp: "+5521999990000",
            linkedin: "in/ana",
            instagram: "@ana",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("LinkedIn")).toBeInTheDocument();
    expect(screen.getByText("Instagram")).toBeInTheDocument();
  });

  it("renders the WhatsApp and Gmail quick actions when the channels exist", () => {
    render(
      <PartnerContactsList
        partnerId="p1"
        partnerName="Agência X"
        contacts={[baseContact({ email: "ana@x.com", whatsapp: "+5521999990000" })]}
      />,
    );

    const row = screen.getByText("Ana Souza").closest("li")!;
    // WhatsAppButton (icon variant) uses a title with the contact name; GmailButton uses "Enviar e-mail para".
    expect(within(row).getByTitle(/WhatsApp/i)).toBeInTheDocument();
    expect(within(row).getByTitle(/Enviar e-mail para Ana Souza/i)).toBeInTheDocument();
  });

  it("does not render the Gmail action when there is no email", () => {
    render(
      <PartnerContactsList
        partnerId="p1"
        partnerName="Agência X"
        contacts={[baseContact({ whatsapp: "+5521999990000" })]}
      />,
    );

    const row = screen.getByText("Ana Souza").closest("li")!;
    expect(within(row).queryByTitle(/Enviar e-mail para/i)).not.toBeInTheDocument();
  });

  it("shows the empty state when there are no contacts", () => {
    render(<PartnerContactsList partnerId="p1" partnerName="Agência X" contacts={[]} />);

    expect(screen.getByText("Nenhum contato cadastrado")).toBeInTheDocument();
    expect(screen.getByText("Contatos (0)")).toBeInTheDocument();
  });
});
