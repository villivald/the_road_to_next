import sharp from "sharp";
import { z } from "zod";
import { wishlistIdSchema } from "@/features/wishlist/service/schemas";
import { MAX_IMAGE_BYTES, MediaError } from "../types";

export const mediaTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("list"), listId: wishlistIdSchema }),
  z.object({
    kind: z.literal("wish"),
    listId: wishlistIdSchema,
    wishId: wishlistIdSchema,
  }),
  z.object({ kind: z.literal("avatar") }),
]);

export const imageDescriptionSchema = z.string().trim().min(1).max(300);

export const prepareImage = async (input: Buffer, avatar: boolean) => {
  if (!input.length || input.length > MAX_IMAGE_BYTES) {
    throw new MediaError("Choose an image smaller than 3 MB.");
  }

  try {
    const image = sharp(input, {
      limitInputPixels: 20_000_000,
      failOn: "warning",
    });
    const metadata = await image.metadata();

    if (
      !["jpeg", "png", "webp"].includes(metadata.format ?? "") ||
      (metadata.pages ?? 1) !== 1 ||
      !metadata.width ||
      !metadata.height ||
      metadata.width > 8192 ||
      metadata.height > 8192
    ) {
      throw new Error("Unsupported image");
    }

    const size = avatar ? 512 : 1600;
    const { data, info } = await image
      .rotate()
      .resize(size, size, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .timeout({ seconds: 10 })
      .toBuffer({ resolveWithObject: true });

    return { data, width: info.width, height: info.height, bytes: info.size };
  } catch {
    throw new MediaError(
      "Choose a valid, still JPEG, PNG, or WebP image up to 20 megapixels and 8192 pixels per side.",
    );
  }
};

// Read incrementally: Content-Length and the browser's MIME type are untrusted.
export const readImageBody = async (request: Request) => {
  const reader = request.body?.getReader();

  if (!reader) {
    throw new MediaError("Choose an image to upload.");
  }

  const chunks: Uint8Array[] = [];
  let bytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      bytes += value.byteLength;

      if (bytes > MAX_IMAGE_BYTES) {
        await reader.cancel();
        throw new MediaError("Choose an image smaller than 3 MB.");
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks);
};
