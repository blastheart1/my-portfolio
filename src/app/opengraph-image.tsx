import { ImageResponse } from "next/og";

export const alt = "Antonio Luis Santos — Full-Stack Developer & QA Specialist";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          padding: "72px 80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(74,222,128,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(74,222,128,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Top-right accent */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(74,222,128,0.08) 0%, transparent 70%)",
          }}
        />

        {/* Domain */}
        <div
          style={{
            position: "absolute",
            top: 64,
            right: 80,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80" }} />
          <span style={{ color: "#6b7280", fontSize: 20, letterSpacing: "0.05em" }}>luis.dev</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 16,
            color: "#4ade80",
            letterSpacing: "0.08em",
            marginBottom: 24,
            display: "flex",
          }}
        >
          ~/portfolio $ whoami
        </div>

        {/* Name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            marginBottom: 20,
            display: "flex",
          }}
        >
          Antonio Luis Santos
        </div>

        {/* Role */}
        <div
          style={{
            fontSize: 28,
            color: "#4ade80",
            fontWeight: 500,
            letterSpacing: "-0.01em",
            marginBottom: 40,
            display: "flex",
          }}
        >
          Full-Stack Developer · QA Specialist · AI Engineer
        </div>

        {/* Tech chips */}
        <div style={{ display: "flex", gap: 12 }}>
          {["Next.js", "TypeScript", "Claude API", "IBM ODM"].map((t) => (
            <div
              key={t}
              style={{
                padding: "6px 16px",
                borderRadius: 999,
                border: "1px solid rgba(74,222,128,0.25)",
                color: "rgba(74,222,128,0.8)",
                fontSize: 15,
                fontFamily: "monospace",
                display: "flex",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
