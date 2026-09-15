export abstract class GoogleDrivePort {
  abstract uploadFile(opts: {
    name: string;
    mimeType: string;
    content: Buffer;
    folderId?: string;
  }): Promise<{ id: string; webViewLink: string }>;

  abstract getOrCreateFolder(name: string, parentId?: string): Promise<string>;

  /**
   * Se a pasta ainda existe. Identificador guardado no banco pode apontar para pasta APAGADA —
   * aconteceu com a HMenezes em 15/09/2026, e todo upload daquele lead passou a falhar porque
   * o codigo confiava no id sem verificar. Nunca lanca: pasta inacessivel conta como ausente.
   */
  abstract folderExists(folderId: string): Promise<boolean>;

  abstract deleteFile(fileId: string): Promise<void>;
}
