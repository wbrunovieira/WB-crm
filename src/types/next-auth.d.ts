import { DefaultSession } from "next-auth";

export type UserRole = "admin" | "sdr" | "closer";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      /** JWT emitido pelo NestJS — usado para chamadas diretas ao backend */
      accessToken: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    accessToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    accessToken: string;
  }
}
