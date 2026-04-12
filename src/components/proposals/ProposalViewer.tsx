"use client";

import { X, FileText, Download } from "lucide-react";

interface Props {
  proposalId: string;
  fileName: string | null;
  mimeType?: string | null;
  onClose: () => void;
}

// Tipos suportados para preview inline
const PREVIEW_SUPPORTED = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

// Tipos que o Google Docs pode renderizar via embed
const GOOGLE_DOCS_SUPPORTED = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export default function ProposalViewer({ proposalId, fileName, mimeType, onClose }: Props) {
  const fileUrl = `/api/proposals/${proposalId}/file?inline=true`;
  const downloadUrl = `/api/proposals/${proposalId}/file`;

  const isDirectPreview = mimeType && PREVIEW_SUPPORTED.includes(mimeType);
  const isGoogleDocsPreview = mimeType && GOOGLE_DOCS_SUPPORTED.includes(mimeType);

  // URL para Google Docs Viewer (funciona com URLs acessíveis pelo servidor Google)
  // Como nossa rota requer auth, usamos o viewer do Drive diretamente via iframe inline
  const iframeSrc = isGoogleDocsPreview
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(
        `${process.env.NEXT_PUBLIC_APP_URL ?? ""}${fileUrl}`
      )}&embedded=true`
    : fileUrl;

  const canPreview = isDirectPreview || isGoogleDocsPreview;

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
            download
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
      <div
        className="flex-1 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {canPreview ? (
          <iframe
            src={iframeSrc}
            className="h-full w-full border-0"
            title={fileName ?? "Visualizar documento"}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-white">
            <FileText size={64} className="text-gray-500" />
            <p className="text-lg font-medium">Visualização não disponível</p>
            <p className="text-sm text-gray-400">
              Este formato não suporta preview. Use Download para abrir com seu aplicativo.
            </p>
            <a
              href={downloadUrl}
              download
              className="mt-2 flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 font-medium hover:bg-purple-700"
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
