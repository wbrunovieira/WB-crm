"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  RemoveFormatting,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
} from "lucide-react";

// Common web-safe / system fonts available before loading the machine's full set.
const DEFAULT_FONTS = [
  "Arial",
  "Helvetica",
  "Calibri",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Georgia",
  "Times New Roman",
  "Cambria",
  "Garamond",
  "Courier New",
  "Roboto",
  "Open Sans",
];

export interface RichTextEditorHandle {
  getHTML: () => string;
  isEmpty: () => boolean;
  focus: () => void;
  setHTML: (html: string) => void;
  insertAtCursor: (text: string) => void;
}

interface RichTextEditorProps {
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  minHeight?: number;
  /** When true the editable area grows to fill the parent's height (used in expanded modal). */
  fillHeight?: boolean;
}

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  ({ placeholder = "Escreva sua mensagem...", onKeyDown, minHeight = 220, fillHeight = false }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
    const [showLink, setShowLink] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const savedRange = useRef<Range | null>(null);
    const [fonts, setFonts] = useState<string[]>(DEFAULT_FONTS);
    const [loadingFonts, setLoadingFonts] = useState(false);

    // Loads the fonts installed on the user's machine via the Local Font Access API
    // (Chromium 103+, requires a user gesture + permission). Falls back silently
    // to DEFAULT_FONTS on unsupported browsers or denied permission.
    const loadSystemFonts = useCallback(async () => {
      const w = window as unknown as { queryLocalFonts?: () => Promise<Array<{ family: string }>> };
      if (typeof w.queryLocalFonts !== "function") return;
      setLoadingFonts(true);
      try {
        const available = await w.queryLocalFonts();
        const families = Array.from(new Set(available.map((f) => f.family))).sort((a, b) =>
          a.localeCompare(b),
        );
        if (families.length > 0) {
          setFonts(Array.from(new Set([...DEFAULT_FONTS, ...families])));
        }
      } catch {
        // permission denied / unsupported — keep the default list
      } finally {
        setLoadingFonts(false);
      }
    }, []);

    useImperativeHandle(ref, () => ({
      getHTML: () => editorRef.current?.innerHTML ?? "",
      isEmpty: () => (editorRef.current?.innerText ?? "").trim().length === 0,
      focus: () => editorRef.current?.focus(),
      setHTML: (html: string) => {
        if (editorRef.current) editorRef.current.innerHTML = html;
      },
      insertAtCursor: (text: string) => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        document.execCommand("insertText", false, text);
      },
    }));

    const syncFormats = useCallback(() => {
      const active = new Set<string>();
      try {
        if (document.queryCommandState("bold")) active.add("bold");
        if (document.queryCommandState("italic")) active.add("italic");
        if (document.queryCommandState("underline")) active.add("underline");
      } catch {}
      setActiveFormats(active);
    }, []);

    // Pasting plain text into a contentEditable collapses its line breaks into
    // spaces, turning a multi-paragraph email into one wall of text. Intercept the
    // paste, escape the text, and preserve the breaks: blank lines become paragraph
    // spacing (double <br>), single newlines become <br>.
    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
      const text = e.clipboardData.getData("text/plain");
      if (!text) return; // let the browser handle non-text (e.g. images)
      e.preventDefault();
      const normalized = text.replace(/\r\n?/g, "\n"); // CRLF/CR → LF
      const escaped = normalized
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const html = escaped
        .split(/\n{2,}/) // blank line → paragraph break
        .map((para) => para.replace(/\n/g, "<br>")) // single newline → line break
        .join("<br><br>");
      document.execCommand("insertHTML", false, html);
    }, []);

    // Runs a document.execCommand keeping focus inside the editor
    const exec = useCallback(
      (cmd: string, value?: string) => {
        editorRef.current?.focus();
        document.execCommand(cmd, false, value ?? undefined);
        syncFormats();
      },
      [syncFormats]
    );

    const handleLinkOpen = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        savedRange.current = sel.getRangeAt(0).cloneRange();
      }
      setLinkUrl("");
      setShowLink(true);
    };

    const handleLinkApply = () => {
      if (!linkUrl.trim()) {
        setShowLink(false);
        return;
      }
      const sel = window.getSelection();
      if (savedRange.current) {
        sel?.removeAllRanges();
        sel?.addRange(savedRange.current);
      }
      const url = /^https?:\/\//i.test(linkUrl) ? linkUrl : `https://${linkUrl}`;
      exec("createLink", url);
      setShowLink(false);
      setLinkUrl("");
    };

    // ─── Toolbar button ──────────────────────────────────────────────────────
    function Btn({
      cmd,
      value,
      icon,
      title,
    }: {
      cmd: string;
      value?: string;
      icon: React.ReactNode;
      title: string;
    }) {
      const active = activeFormats.has(cmd);
      return (
        <button
          type="button"
          title={title}
          onMouseDown={(e) => {
            e.preventDefault(); // keep focus in editor
            exec(cmd, value);
          }}
          className={`rounded p-1.5 transition-colors hover:bg-gray-200 ${
            active ? "bg-gray-200 text-blue-600" : "text-gray-600"
          }`}
        >
          {icon}
        </button>
      );
    }

    function Divider() {
      return <span className="mx-1 h-5 w-px bg-gray-300 shrink-0" />;
    }

    return (
      <div className={`flex flex-col overflow-hidden rounded-lg border border-gray-300 bg-white focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all ${fillHeight ? "h-full" : ""}`}>
        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-0.5 border-b bg-gray-50 px-2 py-1.5">
          {/* Text style */}
          <Btn cmd="bold"      icon={<Bold      className="h-4 w-4" />} title="Negrito (Ctrl+B)" />
          <Btn cmd="italic"    icon={<Italic    className="h-4 w-4" />} title="Itálico (Ctrl+I)" />
          <Btn cmd="underline" icon={<Underline className="h-4 w-4" />} title="Sublinhado (Ctrl+U)" />

          <Divider />

          {/* Font size via formatBlock — headings as proxy for sizes */}
          <select
            title="Tamanho do texto"
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              const val = e.target.value;
              editorRef.current?.focus();
              if (val === "h1" || val === "h2" || val === "p") {
                document.execCommand("formatBlock", false, val);
              } else if (val === "small") {
                // wrap selection in small tag via fontSize
                document.execCommand("fontSize", false, "2");
              }
              syncFormats();
              // reset select display
              e.target.value = "";
            }}
            defaultValue=""
            className="cursor-pointer rounded border border-gray-200 bg-white py-0.5 pl-1 pr-4 text-xs text-gray-700 outline-none"
          >
            <option value="" disabled>Tamanho</option>
            <option value="small">Pequeno</option>
            <option value="p">Normal</option>
            <option value="h2">Grande</option>
            <option value="h1">Enorme</option>
          </select>

          <Divider />

          {/* Font family — applies via fontName; load machine fonts on first open */}
          <div className="flex items-center gap-1">
            <Type className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <select
              title="Fonte"
              onMouseDown={(e) => {
                e.stopPropagation();
                loadSystemFonts(); // lazy-load installed fonts on first interaction
              }}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                editorRef.current?.focus();
                document.execCommand("fontName", false, val);
                syncFormats();
                e.target.value = "";
              }}
              defaultValue=""
              className="max-w-[120px] cursor-pointer rounded border border-gray-200 bg-white py-0.5 pl-1 pr-4 text-xs text-gray-700 outline-none"
            >
              <option value="" disabled>
                {loadingFonts ? "Carregando…" : "Fonte"}
              </option>
              {fonts.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <Divider />

          {/* Alignment */}
          <Btn cmd="justifyLeft"   icon={<AlignLeft   className="h-4 w-4" />} title="Alinhar à esquerda" />
          <Btn cmd="justifyCenter" icon={<AlignCenter className="h-4 w-4" />} title="Centralizar" />
          <Btn cmd="justifyRight"  icon={<AlignRight  className="h-4 w-4" />} title="Alinhar à direita" />

          <Divider />

          {/* Lists */}
          <Btn cmd="insertUnorderedList" icon={<List        className="h-4 w-4" />} title="Lista com marcadores" />
          <Btn cmd="insertOrderedList"   icon={<ListOrdered className="h-4 w-4" />} title="Lista numerada" />

          <Divider />

          {/* Link */}
          <button
            type="button"
            title="Inserir link"
            onMouseDown={(e) => {
              e.preventDefault();
              handleLinkOpen();
            }}
            className="rounded p-1.5 text-gray-600 transition-colors hover:bg-gray-200"
          >
            <Link2 className="h-4 w-4" />
          </button>

          <Divider />

          {/* Remove format */}
          <Btn cmd="removeFormat" icon={<RemoveFormatting className="h-4 w-4" />} title="Remover formatação" />
        </div>

        {/* ── Link input ───────────────────────────────────────────────────── */}
        {showLink && (
          <div className="flex items-center gap-2 border-b bg-blue-50 px-3 py-2">
            <span className="text-xs text-gray-500">Link:</span>
            <input
              autoFocus
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleLinkApply(); }
                if (e.key === "Escape") setShowLink(false);
              }}
              placeholder="https://exemplo.com"
              className="flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button
              type="button"
              onClick={handleLinkApply}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              Inserir
            </button>
            <button
              type="button"
              onClick={() => setShowLink(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* ── Editable area ────────────────────────────────────────────────── */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onPaste={handlePaste}
          onKeyDown={onKeyDown}
          onKeyUp={syncFormats}
          onClick={syncFormats}
          onFocus={syncFormats}
          data-placeholder={placeholder}
          style={fillHeight ? undefined : { minHeight }}
          className={[
            "px-3 py-3 text-sm text-gray-900 outline-none overflow-y-auto",
            fillHeight ? "flex-1 min-h-0" : "",
            // placeholder when empty
            "empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none",
            // list styling
            "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
            // link styling
            "[&_a]:text-blue-600 [&_a]:underline",
          ].join(" ")}
        />
      </div>
    );
  }
);

RichTextEditor.displayName = "RichTextEditor";
export default RichTextEditor;
