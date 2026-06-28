import { Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";
import { TokenGeneratorPort } from "../application/ports/token-generator.port";

@Injectable()
export class CryptoTokenGenerator extends TokenGeneratorPort {
  generate(): string { return randomBytes(24).toString("base64url"); }
}
