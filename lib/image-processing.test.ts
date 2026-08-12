import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_OUTPUT_BYTES
} from "@/lib/image-constraints";
import { prepareStoredImage } from "@/lib/image-processing";

describe("prepareStoredImage", () => {
  it("normalizes a large photo to WebP within the global limits", async () => {
    const source = await sharp({
      create: {
        width: 1600,
        height: 1600,
        channels: 3,
        background: { r: 48, g: 132, b: 99 }
      }
    })
      .jpeg({ quality: 95 })
      .toBuffer();
    const file = new File([source], "foto.jpg", { type: "image/jpeg" });

    const result = await prepareStoredImage(file);

    expect(result.contentType).toBe("image/webp");
    expect(result.width).toBe(MAX_IMAGE_DIMENSION);
    expect(result.height).toBe(MAX_IMAGE_DIMENSION);
    expect(result.data.byteLength).toBeLessThanOrEqual(MAX_IMAGE_OUTPUT_BYTES);
  });

  it("enforces a square crop when a client bypasses the visual editor", async () => {
    const source = await sharp({
      create: {
        width: 1400,
        height: 700,
        channels: 3,
        background: { r: 110, g: 75, b: 170 }
      }
    })
      .png()
      .toBuffer();
    const file = new File([source], "panoramica.png", { type: "image/png" });

    const result = await prepareStoredImage(file);

    expect(result.width).toBe(MAX_IMAGE_DIMENSION);
    expect(result.height).toBe(MAX_IMAGE_DIMENSION);
    expect(result.data.byteLength).toBeLessThanOrEqual(MAX_IMAGE_OUTPUT_BYTES);
  });

  it("rejects formats outside the supported image set", async () => {
    const file = new File(["not an image"], "archivo.gif", { type: "image/gif" });

    await expect(prepareStoredImage(file)).rejects.toThrow(
      "La imagen debe ser JPG, PNG o WebP."
    );
  });
});
