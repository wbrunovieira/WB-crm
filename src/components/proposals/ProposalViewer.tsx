"use client";

import { X, FileText, Download } from "lucide-react";

interface Props {
  proposalId: string;
  fileName: string | null;
  onClose: () => void;
}

/** Determina o tipo pelo nome do arquivo quando mimeType não está disponível */
function getMimeTypeFromFileName(name: string | null): string {
  if (!name) return "application/octet-stream";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf:  "application/pdf",
    png:  "image/png",
    jpg:  "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif:  "image/gif",
    doc:  "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls:  "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt:  "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
  return map[ext] ?? "application/octet-stream";
}

const DIRECT_PREVIEW = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const OFFICE_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

export default function ProposalViewer({ proposalId, fileName, onClose }: Props) {
  const fileUrl = `/api/proposals/${proposalId}/file?inline=true`;
  const downloadUrl = `/api/proposals/${proposalId}/file`;

  const mimeType = getMimeTypeFromFileName(fileName);
  const isDirectPreview = DIRECT_PREVIEW.has(mimeType);
  const isOffice = OFFICE_TYPES.has(mimeType);

  // Para Office: usa o Microsoft Office Online Viewer (não requer autenticação Google)
  // A nossa rota /api/proposals/[id]/file está acessível no servidor, porém o
  // Office Online precisa de URL pública — neste caso usamos o Google Docs Viewer
  // apontando para o URL completo da produção.
  const appUrl = typeof window !== "undefined"
    ? window.location.origin
    : "https://crm.wbdigitalsolutions.com";

  const officeViewerSrc = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
    `${appUrl}${fileUrl}`
  )}`;

  // iframeSrc escolhido por prioridade
  const iframeSrc = isDirectPreview
    ? fileUrl
    : isOffice
    ? officeViewerSrc
    : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80" onClick={onClose}>
      {/* Header */}
      <div
        className="flex items-center justify-between bg-gray-900 px-6 py-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <FileText size={18} className="text-purple-400" />
          <span className="text-sm font-medium truncate max-w-xs">{fileName ?? "Documento"}</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={downloadUrl}
            download={fileName ?? true}
            className="flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium hover:bg-purple-700"
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={14} />
            Download
          </a>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-hidden bg-gray-100" onClick={(e) => e.stopPropagation()}>
        {iframeSrc ? (
          <iframe
            src={iframeSrc}
            className="h-full w-full border-0"
            title={fileName ?? "Visualizar documento"}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-gray-700">
            <FileText size={64} className="text-gray-400" />
            <p className="text-lg font-medium">Visualização não disponível</p>
            <p className="text-sm text-gray-500">
              Este formato não suporta preview. Use Download para abrir com seu aplicativo.
            </p>
            <a
              href={downloadUrl}
              download={fileName ?? true}
              className="mt-2 flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 font-medium text-white hover:bg-purple-700"
            >
              <Download size={18} />
              Baixar arquivo
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
