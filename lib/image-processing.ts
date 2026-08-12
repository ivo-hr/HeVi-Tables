import sharp from "sharp";

import {
  isAcceptedImageType,
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_OUTPUT_BYTES,
  MAX_IMAGE_SOURCE_BYTES
} from "@/lib/image-constraints";

type StoredImage = {
  data: Buffer;
  contentType: "image/webp";
  extension: "webp";
  width: number;
  height: number;
};

export async function prepareStoredImage(file: File): Promise<StoredImage> {
  if (!isAcceptedImageType(file.type)) {
    throw new Error("La imagen debe ser JPG, PNG o WebP.");
  }
  if (file.size > MAX_IMAGE_SOURCE_BYTES) {
    throw new Error("La imagen original no puede superar 10 MB.");
  }

  const input = Buffer.from(await file.arrayBuffer());
  const image = sharp(input, {
    failOn: "error",
    limitInputPixels: 40_000_000
  })
    .rotate()
    .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
      fit: "cover",
      position: "centre",
      withoutEnlargement: true
    });

  for (const quality of [84, 76, 66, 54, 42, 30]) {
    const result = await image
      .clone()
      .webp({ quality, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    if (
      result.info.width <= MAX_IMAGE_DIMENSION &&
      result.info.height <= MAX_IMAGE_DIMENSION &&
      result.data.byteLength <= MAX_IMAGE_OUTPUT_BYTES
    ) {
      return {
        data: result.data,
        contentType: "image/webp",
        extension: "webp",
        width: result.info.width,
        height: result.info.height
      };
    }
  }

  throw new Error("No se pudo comprimir la imagen por debajo de 1 MB.");
}
