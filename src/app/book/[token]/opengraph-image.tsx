import { ImageResponse } from "next/og";

export const alt = "WB Digital Solutions";
// Quadrado e pequeno (<300px) de propósito: faz o WhatsApp mostrar o card COMPACTO
// (miniatura + texto), não o banner grande. Mantém o visual de marca no thumbnail.
export const size = { width: 256, height: 256 };
export const contentType = "image/png";

const LOGO_URL = "https://crm.wbdigitalsolutions.com/email-assets/logo-wb-white.svg";

export default async function Og() {
  let logoSrc: string | null = null;
  try {
    const res = await fetch(LOGO_URL);
    if (res.ok) {
      const svg = await res.text();
      logoSrc = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    }
  } catch {
    logoSrc = null;
  }

  const logoW = 190;
  const logoH = Math.round((logoW * 91) / 245); // mantém a proporção do logo (245×91)

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(120% 90% at 50% -10%, #4a0a5e 0%, #350045 45%, #240030 100%)",
        }}
      >
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            width={logoW}
            height={logoH}
            alt="WB Digital Solutions"
            style={{ borderRadius: 16, boxShadow: "0 12px 34px rgba(0,0,0,0.45)" }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              fontSize: 72,
              fontWeight: 800,
              color: "white",
              letterSpacing: 4,
              fontFamily: "sans-serif",
            }}
          >
            WB
          </div>
        )}
      </div>
    ),
    { ...size },
  );
}
