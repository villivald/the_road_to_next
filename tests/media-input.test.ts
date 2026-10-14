import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  prepareImage,
  prepareImageVariants,
  readImageBody,
} from "@/features/media/service/validation";
import { MAX_IMAGE_BYTES } from "@/features/media/types";
import { requestedImageWidth } from "@/features/media/variants";

const image = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#1264aa" } });

describe("image validation", () => {
  it("accepts only supported, unambiguous variant requests", () => {
    const request = (query: string) =>
      new Request(`http://localhost/api/media/image${query}`);
    expect(requestedImageWidth(request(""))).toBeNull();
    expect(requestedImageWidth(request("?w=400"))).toBe(400);
    for (const query of [
      "?w=0",
      "?w=999",
      "?w=400&w=800",
      "?w=../400",
      "?w=400.5",
      "?w=",
    ]) {
      expect(requestedImageWidth(request(query))).toBeUndefined();
    }
  });
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

  it("creates bounded card variants and does not enlarge small images", async () => {
    const prepared = await prepareImage(
      await image(1800, 900).png().toBuffer(),
      false,
    );
    const variants = await prepareImageVariants(prepared.data, prepared, false);
    expect(variants.map(({ width }) => width)).toEqual([200, 400, 800, 1200]);
    for (const variant of variants) {
      expect(await sharp(variant.data).metadata()).toMatchObject({
        format: "webp",
        width: variant.width,
        height: variant.width / 2,
      });
    }
    const small = await prepareImage(
      await image(180, 90).png().toBuffer(),
      false,
    );
    expect(await prepareImageVariants(small.data, small, false)).toEqual([]);
  });

  it("makes square avatar variants without enlarging either dimension", async () => {
    const prepared = await prepareImage(
      await image(800, 500).png().toBuffer(),
      true,
    );
    const variants = await prepareImageVariants(prepared.data, prepared, true);
    expect(variants.map(({ width }) => width)).toEqual([64, 128, 256]);
    for (const variant of variants) {
      expect(await sharp(variant.data).metadata()).toMatchObject({
        width: variant.width,
        height: variant.width,
      });
    }
    const small = await prepareImage(
      await image(80, 40).png().toBuffer(),
      true,
    );
    expect(await prepareImageVariants(small.data, small, true)).toEqual([]);
  });
});
