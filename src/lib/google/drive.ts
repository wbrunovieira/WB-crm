import { google } from "googleapis";
import { getAuthenticatedClient } from "./auth";

export interface UploadFileOptions {
  name: string;
  mimeType: string;
  content: Buffer | string;
  folderId?: string;
}

export interface UploadFileResult {
  id: string;
  webViewLink: string;
}

async function getDriveClient() {
  const auth = await getAuthenticatedClient();
  return google.drive({ version: "v3", auth });
}

/**
 * Busca uma pasta pelo nome (opcionalmente dentro de um parent).
 * Se não existir, cria e retorna o ID da nova pasta.
 */
export async function getOrCreateFolder(
  name: string,
  parentId?: string
): Promise<string> {
  const drive = await getDriveClient();

  // Monta query de busca
  let q = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentId) {
    q += ` and '${parentId}' in parents`;
  }

  const { data } = await drive.files.list({
    q,
    fields: "files(id)",
    spaces: "drive",
  });

  if (data.files && data.files.length > 0 && data.files[0].id) {
    return data.files[0].id;
  }

  // Pasta não existe — criar
  const requestBody: Record<string, unknown> = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) {
    requestBody.parents = [parentId];
  }

  const { data: created } = await drive.files.create({
    requestBody,
    fields: "id",
  });

  return created.id!;
}

/**
 * Faz upload de um arquivo para o Drive.
 * Retorna o ID e a URL de visualização.
 */
export async function uploadFile(opts: UploadFileOptions): Promise<UploadFileResult> {
  const drive = await getDriveClient();

  const requestBody: Record<string, unknown> = {
    name: opts.name,
  };
  if (opts.folderId) {
    requestBody.parents = [opts.folderId];
  }

  const { data } = await drive.files.create({
    requestBody,
    media: {
      mimeType: opts.mimeType,
      body: opts.content,
    },
    fields: "id,webViewLink",
  });

  return {
    id: data.id!,
    webViewLink: data.webViewLink!,
  };
}

/**
 * Retorna a URL pública de visualização de um arquivo no Drive.
 */
export function getFileUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

/**
 * Remove um arquivo do Drive pelo ID.
 */
export async function deleteFile(fileId: string): Promise<void> {
  const drive = await getDriveClient();
  await drive.files.delete({ fileId });
}
