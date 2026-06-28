import { ImageResponse } from "next/og";

export const alt = "Agende uma reunião com a WB Digital Solutions";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Og() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #350045 0%, #792990 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: 60,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 38, opacity: 0.85, marginBottom: 20, letterSpacing: 2 }}>
          WB DIGITAL SOLUTIONS
        </div>
        <div style={{ fontSize: 84, fontWeight: 800 }}>Agende uma reunião</div>
        <div style={{ fontSize: 32, opacity: 0.85, marginTop: 28 }}>
          Escolha o melhor horário — rápido e sem compromisso
        </div>
      </div>
    ),
    { ...size },
  );
}
