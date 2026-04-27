import { Injectable } from "@nestjs/common";
import { EmailVerifierPort, type EmailVerificationResult } from "../application/ports/email-verifier.port";
import { validate } from "deep-email-validator";

@Injectable()
export class DeepEmailValidatorAdapter extends EmailVerifierPort {
  async verify(email: string): Promise<EmailVerificationResult> {
    try {
      const result = await validate({ email, validateSMTP: false });
      if (result.valid) {
        return { valid: true, status: "valid", reason: "Email válido" };
      }
      const reason = result.reason ?? "unknown";
      if (reason === "disposable") {
        return { valid: false, status: "risky", reason: "Email descartável (domínio temporário)" };
      }
      if (reason === "mx") {
        return { valid: false, status: "invalid", reason: "Domínio não possui servidor de email (sem MX)" };
      }
      if (reason === "smtp") {
        return { valid: false, status: "risky", reason: "Servidor de email não confirmou a caixa" };
      }
      if (reason === "regex") {
        return { valid: false, status: "invalid", reason: "Formato de email inválido" };
      }
      if (reason === "typo") {
        return { valid: false, status: "risky", reason: "Possível erro de digitação no domínio" };
      }
      return { valid: false, status: "invalid", reason: `Email inválido: ${reason}` };
    } catch {
      return { valid: false, status: "unknown", reason: "Erro ao verificar email" };
    }
  }
}
