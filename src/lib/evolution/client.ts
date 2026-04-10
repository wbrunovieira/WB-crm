const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY ?? "";
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE ?? "wbdigital";

interface SendTextResponse {
  key: { id: string; fromMe: boolean; remoteJid: string };
  message: { conversation: string };
  messageTimestamp: number;
  status: string;
}

export async function sendTextMessage(
  to: string,
  text: string
): Promise<SendTextResponse> {
  const res = await fetch(
    `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
      },
      body: JSON.stringify({ number: to, text }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Evolution API error ${res.status}: ${body}`);
  }

  return res.json();
}
