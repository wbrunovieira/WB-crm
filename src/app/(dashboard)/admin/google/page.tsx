import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleDisconnectButton } from "@/components/admin/GoogleDisconnectButton";
import { CheckCircle, XCircle, Mail, AlertTriangle } from "lucide-react";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3010";

async function fetchGoogleToken(accessToken: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/email/token`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data ?? null;
  } catch {
    return null;
  }
}

export default async function GoogleAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  const token = await fetchGoogleToken(session?.user?.accessToken ?? "");
  const isConnected = !!token;

  /**
   * "Existe registro" NÃO é "está funcionando". Entre 25/08 e 13/09/2026 esta tela exibiu
   * "Conectada" por 19 dias com o token revogado: 1835 falhas registradas, Gmail, Drive e Meet
   * parados, e nada aqui dizia isso. Um indicador que não pode ficar vermelho não informa nada.
   *
   * A conexão está quebrada quando houve falha e nenhuma renovação bem-sucedida depois dela.
   */
  const falhouEm = token?.lastFailureAt ? new Date(token.lastFailureAt) : null;
  const renovouEm = token?.lastRefreshOkAt ? new Date(token.lastRefreshOkAt) : null;
  const comProblema = !!falhouEm && (!renovouEm || falhouEm > renovouEm);
  const saudavel = isConnected && !comProblema;

  return (
    <div className="p-8">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
          ← Voltar para Admin
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Integração Google</h1>
        <p className="mt-2 text-gray-600">
          Conecte a conta Google da empresa para envio de e-mails, Drive e Meet
        </p>
      </div>

      {params.success && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-green-800 border border-green-200">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span>Conta Google conectada com sucesso!</span>
        </div>
      )}

      {params.error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-red-800 border border-red-200">
          <XCircle className="h-5 w-5 text-red-600" />
          <span>
            {params.error === "consent_denied" && "Consentimento negado pelo usuário."}
            {params.error === "no_code" && "Código de autorização não recebido."}
            {params.error === "token_exchange" && "Falha ao trocar o código por tokens. Tente novamente."}
            {params.error === "unauthorized" && "Acesso negado."}
          </span>
        </div>
      )}

      {comProblema && (
        <div className="mb-6 max-w-lg rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="flex items-center gap-2 font-semibold text-red-800">
            <AlertTriangle className="h-5 w-5" />
            A conexão caiu — reconecte
          </p>
          <p className="mt-1 text-sm text-red-700">
            Última falha em{" "}
            {falhouEm?.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}.
            Enquanto estiver assim, e-mail, Drive e gravações de reunião não entram no CRM.
          </p>
          {token?.lastFailureReason && (
            <p className="mt-2 text-xs text-red-600">{token.lastFailureReason}</p>
          )}
        </div>
      )}

      <div className="max-w-lg rounded-lg bg-white p-6 shadow">
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-blue-100 p-3">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Conta Google</h2>
            {isConnected ? (
              <p className="text-sm text-gray-600">
                Conectada como <span className="font-medium text-gray-900">{token.email}</span>
              </p>
            ) : (
              <p className="text-sm text-gray-600">Nenhuma conta conectada</p>
            )}
          </div>
          <div className="ml-auto">
            {saudavel ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                <CheckCircle className="h-4 w-4" />
                Conectada
              </span>
            ) : comProblema ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                <AlertTriangle className="h-4 w-4" />
                Com problema
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
                <XCircle className="h-4 w-4" />
                Desconectada
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          {!isConnected ? (
            <Link
              href="/api/google/auth"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Conectar conta Google
            </Link>
          ) : (
            <GoogleDisconnectButton />
          )}
        </div>

        {isConnected && (
          <div className="mt-4 border-t pt-4 text-xs text-gray-500">
            <p>
              Escopos autorizados:{" "}
              <span className="font-mono">{token.scope.replace(/\S+\/auth\//g, "").replace(/ /g, ", ")}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
