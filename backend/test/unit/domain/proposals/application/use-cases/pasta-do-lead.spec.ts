/**
 * A pasta do lead no Drive pode ter sido APAGADA — e o CRM confiava no identificador guardado
 * sem verificar.
 *
 * Caso real (15/09/2026): a pasta da HMenezes foi apagada do Drive. O lead continuou apontando
 * para ela, e todo upload de proposta por aquele lead passou a falhar. Duas propostas ficaram
 * soltas na raiz do Drive, fora de qualquer pasta de cliente.
 *
 * Não é caso isolado: qualquer pasta apagada quebra o lead correspondente para sempre, porque
 * o identificador morto nunca é revisto.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { right } from "@/core/either";
import { UploadProposalUseCase } from "@/domain/proposals/application/use-cases/upload-proposal.use-case";

let drive: {
  folderExists: ReturnType<typeof vi.fn>;
  getOrCreateFolder: ReturnType<typeof vi.fn>;
  uploadFile: ReturnType<typeof vi.fn>;
};
let leads: { findDriveFolder: ReturnType<typeof vi.fn>; setDriveFolder: ReturnType<typeof vi.fn> };
let repo: { save: ReturnType<typeof vi.fn> };
let sut: UploadProposalUseCase;

const arquivo = {
  title: "Proposta",
  fileName: "p.pdf",
  fileMimeType: "application/pdf",
  fileBase64: Buffer.from("conteudo").toString("base64"),
  ownerId: "user-1",
  requesterRole: "admin",
};

beforeEach(() => {
  drive = {
    folderExists: vi.fn().mockResolvedValue(true),
    getOrCreateFolder: vi.fn().mockResolvedValue("pasta-nova"),
    uploadFile: vi.fn().mockResolvedValue({ id: "arq-1", webViewLink: "http://x" }),
  };
  leads = {
    findDriveFolder: vi.fn().mockResolvedValue({ driveFolderId: "pasta-velha", businessName: "HMenezes" }),
    setDriveFolder: vi.fn().mockResolvedValue(undefined),
  };
  repo = { save: vi.fn().mockResolvedValue(undefined) };
  // O validador de posse de parceiro nao participa deste comportamento; um duplo que sempre
  // aprova mantem o teste focado na pasta do Drive.
  const parceiros = { assertAccessible: async () => right(undefined) };
  sut = new UploadProposalUseCase(repo as never, drive as never, leads as never, parceiros as never);
});

describe("UploadProposalUseCase — pasta do lead", () => {
  it("usa a pasta guardada quando ela ainda existe", async () => {
    await sut.execute({ ...arquivo, leadId: "lead-1" });

    expect(drive.folderExists).toHaveBeenCalledWith("pasta-velha");
    expect(drive.uploadFile).toHaveBeenCalledWith(expect.objectContaining({ folderId: "pasta-velha" }));
    expect(leads.setDriveFolder).not.toHaveBeenCalled();
  });

  it("recria a pasta quando a guardada foi APAGADA, em vez de falhar", async () => {
    drive.folderExists.mockResolvedValue(false);

    const r = await sut.execute({ ...arquivo, leadId: "lead-1" });

    expect(r.isRight()).toBe(true);
    expect(drive.uploadFile).toHaveBeenCalledWith(expect.objectContaining({ folderId: "pasta-nova" }));
  });

  it("grava o novo identificador, senão o problema volta no próximo upload", async () => {
    drive.folderExists.mockResolvedValue(false);

    await sut.execute({ ...arquivo, leadId: "lead-1" });

    expect(leads.setDriveFolder).toHaveBeenCalledWith("lead-1", "pasta-nova");
  });

  it("recria com o NOME do cliente, não solta na raiz", async () => {
    // Foi o que aconteceu: as duas propostas da HMenezes ficaram soltas no Drive.
    drive.folderExists.mockResolvedValue(false);

    await sut.execute({ ...arquivo, leadId: "lead-1" });

    expect(drive.getOrCreateFolder).toHaveBeenCalledWith("HMenezes", expect.any(String));
  });

  it("não verifica nada quando o lead nunca teve pasta", async () => {
    leads.findDriveFolder.mockResolvedValue({ driveFolderId: null, businessName: "Novo" });

    await sut.execute({ ...arquivo, leadId: "lead-1" });

    expect(drive.folderExists).not.toHaveBeenCalled();
    expect(leads.setDriveFolder).toHaveBeenCalled();
  });
});
