import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  prepareImage,
  readImageBody,
} from "@/features/media/service/validation";
import { MAX_IMAGE_BYTES } from "@/features/media/types";

const image = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#1264aa" } });

describe("image validation", () => {
  it("decodes, resizes, strips metadata, and preserves aspect ratio", async () => {
    const source = await image(2000, 1000).withMetadata().jpeg().toBuffer();
    const result = await prepareImage(source, false);
    const decoded = await sharp(result.data).metadata();
    expect(result).toMatchObject({ width: 1600, height: 800 });
    expect(decoded.format).toBe("webp");
    expect(decoded.exif).toBeUndefined();
    expect(decoded.icc).toBeUndefined();
    expect((await prepareImage(source, true)).width).toBe(512);
  });

  it.each([
    Buffer.from("not an image"),
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
    ),
    Buffer.alloc(0),
    Buffer.alloc(MAX_IMAGE_BYTES + 1),
  ])("rejects unsupported and oversized files", async (source) => {
    await expect(prepareImage(source, false)).rejects.toThrow();
  });

  it("rejects excessive dimensions and pixel counts before conversion", async () => {
    await expect(
      prepareImage(await image(8193, 1).png().toBuffer(), false),
    ).rejects.toThrow();
    await expect(
      prepareImage(await image(5000, 5000).png().toBuffer(), false),
    ).rejects.toThrow();
  });

  it("rejects oversized streamed bodies even when Content-Length lies", async () => {
    const request = new Request("http://localhost/api/media", {
      method: "POST",
      headers: { "Content-Length": "10" },
      body: Buffer.alloc(MAX_IMAGE_BYTES + 1),
    });
    await expect(readImageBody(request)).rejects.toThrow("3 MB");
  });
});
