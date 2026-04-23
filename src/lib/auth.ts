import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { UserRole } from "@/types/next-auth";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3010";

function isAccessTokenExpiringSoon(jwtToken: string, bufferMs = 5 * 60 * 1000): boolean {
  try {
    const payload = JSON.parse(Buffer.from(jwtToken.split(".")[1], "base64url").toString()) as { exp?: number };
    return !payload.exp || payload.exp * 1000 < Date.now() + bufferMs;
  } catch {
    return true;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email e senha são obrigatórios");
        }

        // Autentica diretamente no NestJS — ele verifica a senha e emite o JWT
        const res = await fetch(`${BACKEND_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: credentials.email, password: credentials.password }),
        });

        if (!res.ok) {
          throw new Error("Credenciais inválidas");
        }

        const { accessToken } = await res.json() as { accessToken: string };

        // Decodifica o payload do JWT (sem verificar — já foi verificado pelo NestJS)
        const payload = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString());

        return {
          id: payload.sub as string,
          email: payload.email as string,
          name: payload.name as string,
          role: payload.role as UserRole,
          accessToken,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accessToken = user.accessToken;
      }
      // Gera/renova o accessToken compatível com o NestJS quando ausente ou expirado.
      // Usa o mesmo NEXTAUTH_SECRET que o NestJS usa para verificar.
      const needsRefresh = !token.accessToken || isAccessTokenExpiringSoon(token.accessToken as string);
      if (needsRefresh && token.sub) {
        const { SignJWT } = await import("jose");
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
        token.accessToken = await new SignJWT({
          sub: token.sub,
          name: token.name,
          email: token.email,
          role: token.role ?? token.id,
        })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("7d")
          .sign(secret);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.accessToken = token.accessToken;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
