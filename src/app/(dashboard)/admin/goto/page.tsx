import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CheckCircle, XCircle, Phone, AlertTriangle } from "lucide-react";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3010";

interface GoToStatus {
  connected: boolean;
  hasRefreshToken?: boolean;
  expiresAt?: number;
  isExpired?: boolean;
  expiresInMs?: number;
}

async function fetchGoToStatus(accessToken: string): Promise<GoToStatus> {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/goto/status`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return { connected: false };
    return await res.json();
  } catch {
    return { connected: false };
  }
}

function formatExpiry(expiresInMs: number): string {
  if (expiresInMs <= 0) return "Expirado";
  const minutes = Math.floor(expiresInMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `expira em ${days}d ${hours % 24}h`;
  if (hours > 0) return `expira em ${hours}h ${minutes % 60}min`;
  return `expira em ${minutes}min`;
}

export default async function GoToAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  const status = await fetchGoToStatus(session?.user?.accessToken ?? "");

  const isAdmin = session?.user?.role?.toLowerCase() === "admin";

  return (
    <div className="p-8">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
          ← Voltar para Admin
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Integração GoTo Connect</h1>
        <p className="mt-2 text-gray-600">
          Conecte o GoTo Connect para registrar ligações, gravações e análises SPICED
        </p>
      </div>

      {params.success && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-green-800 border border-green-200">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span>GoTo Connect reconectado com sucesso! Tokens frescos gravados no banco.</span>
        </div>
      )}

      {params.error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-red-800 border border-red-200">
          <XCircle className="h-5 w-5 text-red-600" />
          <span>
            {params.error === "no_code" && "Código de autorização não recebido."}
            {params.error === "token_exchange_failed" && "Falha ao trocar o código por tokens. Tente novamente."}
            {params.error === "unauthorized" && "Acesso negado."}
            {!["no_code", "token_exchange_failed", "unauthorized"].includes(params.error) &&
              `Erro: ${params.error}`}
          </span>
        </div>
      )}

      <div className="max-w-lg rounded-lg bg-white p-6 shadow">
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-teal-100 p-3">
            <Phone className="h-8 w-8 text-teal-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">GoTo Connect</h2>
            <p className="text-sm text-gray-600">
              {status.connected ? "Integração ativa" : "Nenhum token configurado"}
            </p>
          </div>
          <div className="ml-auto">
            {status.connected && !status.isExpired ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                <CheckCircle className="h-4 w-4" />
                Conectado
              </span>
            ) : status.connected && status.isExpired ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                Token expirado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
                <XCircle className="h-4 w-4" />
                Desconectado
              </span>
            )}
          </div>
        </div>

        {status.connected && status.expiresAt && (
          <div className="mt-4 text-sm text-gray-500">
            Access token: {formatExpiry(status.expiresInMs ?? 0)}
            {status.hasRefreshToken && (
              <span className="ml-2 text-green-600">· refresh token presente</span>
            )}
          </div>
        )}

        {isAdmin && (
          <div className="mt-6 flex gap-3">
            <Link
              href="/api/goto/auth"
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
            >
              <Phone className="h-4 w-4" />
              {status.connected ? "Reconectar GoTo" : "Conectar GoTo"}
            </Link>
          </div>
        )}

        {!isAdmin && (
          <p className="mt-4 text-sm text-gray-500">Apenas administradores podem reconectar o GoTo.</p>
        )}
      </div>

      <div className="mt-6 max-w-lg rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
        <p className="font-medium mb-1">Como funciona</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Ao clicar em Reconectar, você será redirecionado para o GoTo para autorizar</li>
          <li>Os tokens são armazenados no PostgreSQL — sobrevivem a reinicializações do servidor</li>
          <li>O refresh token é rotacionado automaticamente a cada uso</li>
          <li>Em caso de erro de autenticação, reconecte aqui</li>
        </ul>
      </div>
    </div>
  );
}
