import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: rawSize } = await params;
  const size = Number(rawSize);
  if (size !== 192 && size !== 512) {
    return new Response("Not found", { status: 404 });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#14a074",
          color: "#fffaf2",
          borderRadius: size * 0.22,
          fontFamily: "sans-serif",
          fontWeight: 900,
          fontSize: size * 0.55,
          letterSpacing: "-0.08em",
          paddingRight: size * 0.05
        }}
      >
        H
      </div>
    ),
    { width: size, height: size }
  );
}
