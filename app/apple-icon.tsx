import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          fontFamily: "sans-serif",
          fontSize: 102,
          fontWeight: 900,
          paddingRight: 8
        }}
      >
        H
      </div>
    ),
    size
  );
}
