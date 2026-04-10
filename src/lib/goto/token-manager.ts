import { execSync } from "child_process";
import { refreshAccessToken, isTokenExpired } from "./auth";
import { logger } from "@/lib/logger";

const log = logger.child({ context: "goto-token-manager" });

/**
 * Retorna um access_token válido.
 * Se o token atual estiver expirado (ou próximo de expirar), usa o refresh_token
 * para obter um novo e persiste as novas variáveis de ambiente no arquivo .env
 * do servidor (somente em produção).
 */
export async function getValidAccessToken(): Promise<string> {
  const accessToken = process.env.GOTO_ACCESS_TOKEN;
  const refreshToken = process.env.GOTO_REFRESH_TOKEN;
  const expiresAt = Number(process.env.GOTO_TOKEN_EXPIRES_AT ?? "0");

  if (!accessToken) {
    throw new Error("GOTO_ACCESS_TOKEN não configurado");
  }

  // Token ainda válido
  if (!isTokenExpired(expiresAt)) {
    return accessToken;
  }

  if (!refreshToken) {
    throw new Error(
      "GOTO_ACCESS_TOKEN expirado e GOTO_REFRESH_TOKEN não configurado"
    );
  }

  log.info("GoTo access_token expirado — renovando via refresh_token");

  const tokens = await refreshAccessToken(refreshToken);

  // Atualiza process.env para o restante desta execução
  process.env.GOTO_ACCESS_TOKEN = tokens.accessToken;
  process.env.GOTO_TOKEN_EXPIRES_AT = String(tokens.expiresAt);

  // Persiste no .env do servidor (best-effort — não lança erro se falhar)
  try {
    const envPath = process.env.ENV_FILE_PATH ?? "/opt/wb-crm/.env";
    const escapedToken = tokens.accessToken.replace(/"/g, '\\"');
    execSync(
      `sed -i 's|^GOTO_ACCESS_TOKEN=.*|GOTO_ACCESS_TOKEN="${escapedToken}"|' ${envPath} && ` +
        `sed -i 's|^GOTO_TOKEN_EXPIRES_AT=.*|GOTO_TOKEN_EXPIRES_AT="${tokens.expiresAt}"|' ${envPath}`
    );
    log.info("GoTo tokens renovados e persistidos no .env");
  } catch (err) {
    log.warn("Não foi possível persistir tokens no .env — serão válidos apenas nesta execução", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return tokens.accessToken;
}
