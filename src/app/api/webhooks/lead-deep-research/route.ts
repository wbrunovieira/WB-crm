import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3010";

// Proxy para o webhook de deep-research do backend.
//
// ANTES este proxy INJETAVA o WEBHOOK_SECRET quando o cliente não mandava nenhum, o que
// transformava uma rota pública e sem autenticação numa porta para escrever em qualquer lead
// (qualquer um na internet podia corromper lead e criar contatos falsos). O segredo agora só
// é repassado se o CLIENTE apresentar um válido — o proxy nunca mais o fabrica. E o
// x-forwarded-for do cliente não é mais repassado: o backend deixou de confiar em IP de
// header, e repassá-lo só reabriria o mesmo bypass por outro caminho.
export async function POST(req: NextRequest) {
  const clientSecret = req.headers.get("x-webhook-secret");
  const expected = process.env.WEBHOOK_SECRET;

  // Falha fechada: sem segredo configurado no servidor, ou sem segredo válido do cliente,
  // nada é encaminhado. Melhor recusar do que vazar a credencial interna.
  if (!expected || clientSecret !== expected) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.text();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-webhook-secret": expected,
  };

  const apiKey = req.headers.get("x-internal-api-key");
  if (apiKey) headers["x-internal-api-key"] = apiKey;

  const res = await fetch(`${BACKEND_URL}/webhooks/lead-deep-research`, {
    method: "POST",
    headers,
    body,
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
