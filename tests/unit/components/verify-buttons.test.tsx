import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { EmailVerifyButton } from "@/components/shared/verify/EmailVerifyButton";
import { PhoneVerifyButton } from "@/components/shared/verify/PhoneVerifyButton";
import { emailBadgeStatus } from "@/components/shared/verify/verify-badges";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { accessToken: "tok" } } }),
}));
vi.mock("@/lib/api-client", () => ({ apiFetch: vi.fn() }));

describe("emailBadgeStatus", () => {
  it("mapeia status/valid → badge", () => {
    expect(emailBadgeStatus("deliverable", true)).toBe("valid");
    expect(emailBadgeStatus("risky", false)).toBe("risky");
    expect(emailBadgeStatus("unknown", false)).toBe("unknown");
    expect(emailBadgeStatus("undeliverable", false)).toBe("invalid");
  });
});

describe("EmailVerifyButton", () => {
  it("idle sem verificação → botão de verificar", () => {
    render(<EmailVerifyButton email="a@b.com" endpoint="/email/verify/lead/1" />);
    expect(screen.getByTitle("Verificar email: a@b.com")).toBeInTheDocument();
  });

  it("com verificação existente válida → badge 'Email válido'", () => {
    render(
      <EmailVerifyButton
        email="a@b.com"
        endpoint="/email/verify/lead/1"
        verified={{ at: "2026-07-01", status: "deliverable", reason: "ok", valid: true }}
      />,
    );
    expect(screen.getByText(/Email válido/)).toBeInTheDocument();
    expect(screen.getByTitle("Re-verificar email")).toBeInTheDocument();
  });

  it("verificação existente inválida → badge 'Inválido'", () => {
    render(
      <EmailVerifyButton
        email="a@b.com"
        endpoint="/x"
        verified={{ at: "2026-07-01", status: "undeliverable", reason: "bounce", valid: false }}
      />,
    );
    expect(screen.getByText(/Inválido/)).toBeInTheDocument();
  });
});

describe("PhoneVerifyButton", () => {
  it("sem nenhum telefone → não renderiza nada", () => {
    const { container } = render(<PhoneVerifyButton endpoint="/phone/verify/lead/1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("com telefone e sem existing → botão de verificar", () => {
    render(<PhoneVerifyButton endpoint="/phone/verify/lead/1" phone="+5511999998888" />);
    expect(screen.getByTitle("Verificar formato dos telefones")).toBeInTheDocument();
  });

  it("com existing válido → badge 'Tel válido' (por número presente)", () => {
    render(
      <PhoneVerifyButton
        endpoint="/phone/verify/lead/1"
        phone="+5511999998888"
        whatsapp="+5511988887777"
        existing={{ phoneValid: true, phoneType: "fixo", whatsappPhoneValid: false, whatsappPhoneType: "movel" }}
      />,
    );
    expect(screen.getByText("Tel válido")).toBeInTheDocument();
    expect(screen.getByText("WA inválido")).toBeInTheDocument();
  });
});
