import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://wtwchitralahari.netlify.app";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 10% 10%, #0f172a 0%, #020617 70%)",
          color: "#e2e8f0",
          padding: "80px",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif"
        }}
      >
        <div style={{ fontSize: 56, fontWeight: 800, marginBottom: 16 }}>
          Chitralahari
        </div>
        <div style={{ fontSize: 28, color: "#94a3b8", marginBottom: 24 }}>
          Daily Telugu movie guessing game
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          {["🟩", "🟨", "⬛", "🟩", "⬛", "🟨"].map((tile, i) => (
            <div
              key={i}
              style={{
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                borderRadius: 10,
                backgroundColor: "#0b1220"
              }}
            >
              {tile}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 22, color: "#cbd5f5" }}>{siteUrl}</div>
      </div>
    ),
    size
  );
}

