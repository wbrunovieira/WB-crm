/**
 * PartnerStatusBadge Component Tests
 *
 * Tests for src/components/partners/PartnerStatusBadge.tsx
 * - Maps each known lifecycle status to its pt-BR label
 * - Falls back to the raw value for an unknown status
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PartnerStatusBadge } from "@/components/partners/PartnerStatusBadge";

describe("PartnerStatusBadge", () => {
  it("renders the 'Lead de parceiro' label for prospect", () => {
    render(<PartnerStatusBadge status="prospect" />);
    expect(screen.getByText("Lead de parceiro")).toBeInTheDocument();
  });

  it("renders the 'Parceria ativa' label for active", () => {
    render(<PartnerStatusBadge status="active" />);
    expect(screen.getByText("Parceria ativa")).toBeInTheDocument();
  });

  it("renders the 'Inativa' label for inactive", () => {
    render(<PartnerStatusBadge status="inactive" />);
    expect(screen.getByText("Inativa")).toBeInTheDocument();
  });

  it("falls back to the raw value for an unknown status", () => {
    render(<PartnerStatusBadge status="mistério" />);
    expect(screen.getByText("mistério")).toBeInTheDocument();
  });
});
