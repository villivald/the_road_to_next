import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/media/[id]/route";
import { DELETE, POST } from "@/app/api/media/route";
import { backfillImageVariants } from "@/features/media/service/backfill";
import { cleanupMedia } from "@/features/media/service/cleanup";
import {
  readableImage,
  removeImage,
  replaceImage,
} from "@/features/media/service/media";
import { mediaStorage } from "@/features/media/service/storage";
import { prepareImage } from "@/features/media/service/validation";
import { imageStoragePaths } from "@/features/media/variants";
import {
  createWish,
  deleteWish,
  transitionWish,
} from "@/features/wish/service/wishes";
import {
  createWishlist,
  deleteWishlist,
  setWishlistPublication,
} from "@/features/wishlist/service/lists";
import { prisma } from "@/lib/prisma";
import { assertTestDatabase, testOrigin } from "../e2e/environment";
import { resetFixtures } from "../e2e/seed";

const auth = vi.hoisted(() => ({ id: "e2e-owner" as string | null }));
vi.mock("@/features/auth/actions/get-auth", () => ({
  getAuth: async () => ({
    user: auth.id ? { id: auth.id, emailVerified: true } : null,
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

let listId: string;
let wishId: string;
let bytes: Buffer;
const expired = new Date(0);
const detach = { wishlistId: null, wishId: null, userId: null };
const listTarget = () => ({ kind: "list" as const, listId });
const wishTarget = () => ({ kind: "wish" as const, listId, wishId });
const largeImage = () =>
  sharp({
    create: { width: 1400, height: 700, channels: 3, background: "green" },
  })
    .png()
    .toBuffer();
const legacyImage = async () => {
  const { data, ...dimensions } = await prepareImage(await largeImage(), false);
  const media = await prisma.media.create({
    data: {
      ...dimensions,
      pathname: `images/${randomUUID()}.webp`,
      provider: "LOCAL",
      alt: "Legacy image",
      state: "READY",
      wishlistId: listId,
      cleanupAfter: new Date(),
    },
  });
  await mediaStorage.put(media.provider, media.pathname, data);
  return media;
};
const read = (id: string, width?: number) =>
  GET(
    new Request(`${testOrigin}/api/media/${id}${width ? `?w=${width}` : ""}`, {
      headers: {
        "If-None-Match": '"old"',
        "If-Modified-Since": new Date().toUTCString(),
      },
    }),
    { params: Promise.resolve({ id }) },
  );

assertTestDatabase(process.env);

beforeEach(async () => {
  vi.restoreAllMocks();
  auth.id = "e2e-owner";
  await resetFixtures();
  await prisma.media.updateMany({
    where: detach,
    data: { cleanupAfter: expired },
  });
  await cleanupMedia();
  ({ id: listId } = await createWishlist("e2e-owner", {
    title: "Images",
    description: "",
    reservationsEnabled: true,
  }));
  ({ id: wishId } = await createWish("e2e-owner", listId, {
    title: "A camera",
  }));
  bytes = await sharp({
    create: { width: 80, height: 40, channels: 3, background: "green" },
  })
    .png()
    .toBuffer();
});

afterAll(async () => {
  await resetFixtures();
  await prisma.media.updateMany({
    where: detach,
    data: { cleanupAfter: expired },
  });
  await cleanupMedia();
  await prisma.$disconnect();
});

describe("private media", () => {
  it("serves generated sizes with the same reservation and visibility rules", async () => {
    await setWishlistPublication("e2e-owner", listId, "PUBLISHED");
    const image = await replaceImage(
      "e2e-owner",
      wishTarget(),
      "Camera",
      await largeImage(),
    );
    expect(image.variantWidths).toEqual([200, 400, 800, 1200]);
    auth.id = null;
    const response = await read(image.id, 400);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(
      await sharp(Buffer.from(await response.arrayBuffer())).metadata(),
    ).toMatchObject({ width: 400, height: 200 });
    await prisma.reservation.create({ data: { wishId, userId: "e2e-member" } });
    expect((await read(image.id, 400)).status).toBe(404);
    auth.id = "e2e-member";
    expect((await read(image.id, 400)).status).toBe(200);
    await transitionWish("e2e-owner", listId, wishId, "hide");
    expect((await read(image.id, 400)).status).toBe(404);
    auth.id = "e2e-owner";
    expect((await read(image.id, 400)).status).toBe(200);
  });

  it("rechecks variant access after storage I/O and rejects unsupported sizes", async () => {
    await setWishlistPublication("e2e-owner", listId, "PUBLISHED");
    const image = await replaceImage(
      "e2e-owner",
      listTarget(),
      "Landscape",
      await largeImage(),
    );
    expect((await read(image.id, 999)).status).toBe(404);
    auth.id = null;
    const get = mediaStorage.get.bind(mediaStorage);
    vi.spyOn(mediaStorage, "get").mockImplementationOnce(async (...args) => {
      const data = await get(...args);
      await setWishlistPublication("e2e-owner", listId, "DRAFT");
      return data;
    });
    expect((await read(image.id, 400)).status).toBe(404);
  });

  it("cleans every variant after partial upload and deletion failures", async () => {
    const write = mediaStorage.put.bind(mediaStorage);
    vi.spyOn(mediaStorage, "put").mockImplementation(
      async (provider, pathname, data) => {
        if (pathname.endsWith("-400.webp"))
          throw new Error("Variant storage offline");
        await write(provider, pathname, data);
      },
    );
    await expect(
      replaceImage("e2e-owner", listTarget(), "Partial", await largeImage()),
    ).rejects.toThrow("Variant storage offline");
    const media = await prisma.media.findFirstOrThrow({
      where: { state: "PENDING" },
    });
    expect(await readableImage(media.id, "e2e-owner")).toBeNull();
    await prisma.media.update({
      where: { id: media.id },
      data: { cleanupAfter: expired },
    });
    const remove = mediaStorage.delete.bind(mediaStorage);
    vi.spyOn(mediaStorage, "delete")
      .mockImplementationOnce(remove)
      .mockRejectedValueOnce(new Error("Deletion offline"));
    expect(await cleanupMedia()).toEqual({ deleted: 0, failed: 1 });
    await prisma.media.update({
      where: { id: media.id },
      data: { cleanupAfter: expired },
    });
    expect(await cleanupMedia()).toEqual({ deleted: 1, failed: 0 });
    for (const pathname of imageStoragePaths(media))
      expect(await mediaStorage.get(media.provider, pathname)).toBeNull();
  });

  it("backfills legacy images atomically while retaining IDs and deleting old files", async () => {
    const original = await legacyImage();
    const fallback = await read(original.id, 400);
    expect(
      await sharp(Buffer.from(await fallback.arrayBuffer())).metadata(),
    ).toMatchObject({ width: 1400 });
    expect(await backfillImageVariants()).toEqual({
      processed: 1,
      skipped: 0,
      failed: 0,
      remaining: 0,
    });
    const updated = await prisma.media.findUniqueOrThrow({
      where: { id: original.id },
    });
    expect(updated).toMatchObject({
      wishlistId: listId,
      variantWidths: [200, 400, 800, 1200],
      variantVersion: 1,
    });
    const response = await read(original.id, 400);
    expect(
      await sharp(Buffer.from(await response.arrayBuffer())).metadata(),
    ).toMatchObject({ width: 400 });
    expect(await backfillImageVariants()).toEqual({
      processed: 0,
      skipped: 0,
      failed: 0,
      remaining: 0,
    });
    expect((await cleanupMedia()).deleted).toBe(1);
    expect(
      await mediaStorage.get(original.provider, original.pathname),
    ).toBeNull();
    for (const pathname of imageStoragePaths(updated))
      expect(await mediaStorage.get(updated.provider, pathname)).not.toBeNull();
    await removeImage("e2e-owner", listTarget());
    expect((await read(original.id, 400)).status).toBe(404);
    expect((await cleanupMedia()).deleted).toBe(1);
    for (const pathname of imageStoragePaths(updated))
      expect(await mediaStorage.get(updated.provider, pathname)).toBeNull();
  });

  it("keeps originals usable when backfill storage fails", async () => {
    const original = await legacyImage();
    vi.spyOn(mediaStorage, "put").mockRejectedValueOnce(new Error("Offline"));
    expect(await backfillImageVariants()).toEqual({
      processed: 0,
      skipped: 0,
      failed: 1,
      remaining: 1,
    });
    expect((await read(original.id)).status).toBe(200);
    expect(
      await prisma.media.findUnique({ where: { id: original.id } }),
    ).toMatchObject({ pathname: original.pathname, variantVersion: 0 });
    await prisma.media.updateMany({
      where: { state: "PENDING" },
      data: { cleanupAfter: expired },
    });
    expect((await cleanupMedia()).deleted).toBe(1);
    expect((await read(original.id)).status).toBe(200);
  });

  it("does not resurrect an image replaced during backfill", async () => {
    const original = await legacyImage();
    const write = mediaStorage.put.bind(mediaStorage);
    let replacementId = "";
    vi.spyOn(mediaStorage, "put").mockImplementationOnce(async (...args) => {
      await write(...args);
      replacementId = (
        await replaceImage("e2e-owner", listTarget(), "Replacement", bytes)
      ).id;
    });
    expect(await backfillImageVariants()).toEqual({
      processed: 0,
      skipped: 1,
      failed: 0,
      remaining: 0,
    });
    expect((await read(original.id)).status).toBe(404);
    expect((await read(replacementId)).status).toBe(200);
    expect((await cleanupMedia()).deleted).toBe(2);
    expect((await read(replacementId)).status).toBe(200);
  });

  it("creates a wish and its image together with title fallback and normal access rules", async () => {
    const wish = await createWish(
      "e2e-owner",
      listId,
      { title: "A blue camera", hidden: true },
      { bytes, alt: "" },
    );
    const image = await prisma.media.findUniqueOrThrow({
      where: { wishId: wish.id },
    });
    expect(image).toMatchObject({
      state: "READY",
      alt: "A blue camera",
      userId: null,
      wishlistId: null,
    });
    expect(await readableImage(image.id, "e2e-owner")).not.toBeNull();
    expect(await readableImage(image.id, "e2e-member")).toBeNull();
    await setWishlistPublication("e2e-owner", listId, "PUBLISHED");
    expect(await readableImage(image.id, null)).toBeNull();
    await transitionWish("e2e-owner", listId, wish.id, "unhide");
    expect(await readableImage(image.id, null)).not.toBeNull();
  });

  it("rejects invalid images and unauthorized creation without creating a wish", async () => {
    const count = await prisma.wish.count({ where: { wishlistId: listId } });
    const write = vi.spyOn(mediaStorage, "put");
    await expect(
      createWish(
        "e2e-member",
        listId,
        { title: "Denied" },
        { bytes, alt: "Camera" },
      ),
    ).rejects.toThrow();
    await expect(
      createWish(
        "e2e-owner",
        listId,
        { title: "Invalid image" },
        { bytes: Buffer.from("invalid"), alt: "Camera" },
      ),
    ).rejects.toThrow("valid, still JPEG");
    await expect(
      createWish("e2e-owner", listId, { title: " " }, { bytes, alt: "Camera" }),
    ).rejects.toThrow();
    expect(write).not.toHaveBeenCalled();
    expect(await prisma.wish.count({ where: { wishlistId: listId } })).toBe(
      count,
    );
  });

  it("leaves cleanup work but no partial wish when creation storage fails", async () => {
    vi.spyOn(mediaStorage, "put").mockRejectedValueOnce(
      new Error("Storage offline"),
    );
    await expect(
      createWish(
        "e2e-owner",
        listId,
        { title: "Failed creation" },
        { bytes, alt: "Camera" },
      ),
    ).rejects.toThrow("Storage offline");
    expect(
      await prisma.wish.count({ where: { title: "Failed creation" } }),
    ).toBe(0);
    const pending = await prisma.media.findFirstOrThrow({
      where: { state: "PENDING" },
    });
    expect(pending.wishId).toBeNull();
    expect(await readableImage(pending.id, "e2e-owner")).toBeNull();
    await prisma.media.update({
      where: { id: pending.id },
      data: { cleanupAfter: expired },
    });
    expect((await cleanupMedia()).deleted).toBe(1);
  });

  it("rechecks creation permission after uploading and rolls back the wish when access changes", async () => {
    const write = mediaStorage.put.bind(mediaStorage);
    vi.spyOn(mediaStorage, "put").mockImplementationOnce(async (...args) => {
      await write(...args);
      await prisma.user.update({
        where: { id: "e2e-owner" },
        data: { emailVerified: false },
      });
    });
    await expect(
      createWish(
        "e2e-owner",
        listId,
        { title: "Lost creation access" },
        { bytes, alt: "Camera" },
      ),
    ).rejects.toThrow();
    expect(
      await prisma.wish.count({ where: { title: "Lost creation access" } }),
    ).toBe(0);
    const pending = await prisma.media.findFirstOrThrow({
      where: { state: "PENDING" },
    });
    expect(await readableImage(pending.id, "e2e-owner")).toBeNull();
  });

  it("rechecks draft, public, private, revoked membership and archived access even on conditional requests", async () => {
    const image = await replaceImage(
      "e2e-owner",
      listTarget(),
      "A mountain",
      bytes,
    );
    expect(Object.keys(image).sort()).toEqual([
      "alt",
      "height",
      "id",
      "variantWidths",
      "width",
    ]);
    expect((await read(image.id)).status).toBe(200);
    auth.id = null;
    expect((await read(image.id)).status).toBe(404);
    await setWishlistPublication("e2e-owner", listId, "PUBLISHED");
    const response = await read(image.id);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Vary")).toBe("Cookie");
    expect(
      (await sharp(Buffer.from(await response.arrayBuffer())).metadata())
        .format,
    ).toBe("webp");

    await prisma.wishlist.update({
      where: { id: listId },
      data: { visibility: "PRIVATE" },
    });
    expect((await read(image.id)).status).toBe(404);
    const member = await prisma.membership.create({
      data: { wishlistId: listId, userId: "e2e-member" },
    });
    auth.id = "e2e-member";
    expect((await read(image.id)).status).toBe(200);
    await prisma.membership.delete({ where: { id: member.id } });
    expect((await read(image.id)).status).toBe(404);
    auth.id = "e2e-owner";
    await prisma.wishlist.update({
      where: { id: listId },
      data: { archivedAt: new Date() },
    });
    expect((await read(image.id)).status).toBe(404);
  });

  it("protects hidden, fulfilled and reserved wish images without disclosing the reserver", async () => {
    await setWishlistPublication("e2e-owner", listId, "PUBLISHED");
    const image = await replaceImage(
      "e2e-owner",
      wishTarget(),
      "Camera",
      bytes,
    );
    expect(await readableImage(image.id, null)).not.toBeNull();
    await prisma.reservation.create({ data: { userId: "e2e-member", wishId } });
    expect(await readableImage(image.id, null)).toBeNull();
    expect(await readableImage(image.id, "e2e-member")).not.toBeNull();
    expect(await readableImage(image.id, "e2e-owner")).not.toBeNull();
    await transitionWish("e2e-owner", listId, wishId, "hide");
    expect(await readableImage(image.id, "e2e-member")).toBeNull();
    await transitionWish("e2e-owner", listId, wishId, "unhide");
    await transitionWish("e2e-owner", listId, wishId, "fulfill");
    expect(await readableImage(image.id, null)).toBeNull();
    expect(await readableImage(image.id, "e2e-owner")).not.toBeNull();
  });

  it("restricts avatar reads to the verified owner and retains cleanup after account deletion", async () => {
    const image = await replaceImage(
      "e2e-owner",
      { kind: "avatar", userId: "e2e-member" },
      "My avatar",
      bytes,
    );
    expect(await readableImage(image.id, null)).toBeNull();
    expect(await readableImage(image.id, "e2e-member")).toBeNull();
    expect(await readableImage(image.id, "e2e-owner")).not.toBeNull();
    await deleteWishlist("e2e-owner", listId);
    await prisma.wishlist.delete({ where: { id: "e2e-archived-list" } });
    await prisma.user.delete({ where: { id: "e2e-owner" } });
    expect(await readableImage(image.id, "e2e-owner")).toBeNull();
    expect(
      await prisma.media.findUnique({ where: { id: image.id } }),
    ).toMatchObject({ userId: null });
  });

  it("denies other users, unverified admins, forged wish parents and revoked permission after upload", async () => {
    await expect(
      replaceImage("e2e-member", listTarget(), "Denied", bytes),
    ).rejects.toThrow();
    await expect(
      replaceImage(
        "e2e-owner",
        { ...wishTarget(), wishId: "e2e-wish" },
        "Denied",
        bytes,
      ),
    ).rejects.toThrow();
    const write = mediaStorage.put.bind(mediaStorage);
    vi.spyOn(mediaStorage, "put").mockImplementationOnce(async (...args) => {
      await write(...args);
      await prisma.user.update({
        where: { id: "e2e-owner" },
        data: { emailVerified: false },
      });
    });
    await expect(
      replaceImage("e2e-owner", listTarget(), "Lost access", bytes),
    ).rejects.toThrow();
    const pending = await prisma.media.findFirstOrThrow({
      where: { state: "PENDING" },
    });
    expect(await readableImage(pending.id, "e2e-owner")).toBeNull();
    await expect(removeImage("e2e-owner", listTarget())).rejects.toThrow();
  });

  it("replaces atomically, revokes old URLs immediately, and retries failed deletions", async () => {
    const first = await replaceImage("e2e-owner", listTarget(), "First", bytes);
    const second = await replaceImage(
      "e2e-owner",
      listTarget(),
      "Second",
      bytes,
    );
    expect(await readableImage(first.id, "e2e-owner")).toBeNull();
    expect(await readableImage(second.id, "e2e-owner")).not.toBeNull();
    vi.spyOn(mediaStorage, "delete").mockRejectedValueOnce(
      new Error("Storage offline"),
    );
    expect(await cleanupMedia()).toEqual({ deleted: 0, failed: 1 });
    const queued = await prisma.media.findUniqueOrThrow({
      where: { id: first.id },
    });
    expect(queued).toMatchObject({ state: "DELETING", attempts: 1 });
    await prisma.media.update({
      where: { id: first.id },
      data: { cleanupAfter: expired },
    });
    expect(await cleanupMedia()).toEqual({ deleted: 1, failed: 0 });
    expect(await mediaStorage.get(queued.provider, queued.pathname)).toBeNull();
    expect(await readableImage(second.id, "e2e-owner")).not.toBeNull();
    await removeImage("e2e-owner", listTarget());
    expect(await readableImage(second.id, "e2e-owner")).toBeNull();
    expect((await cleanupMedia()).deleted).toBe(1);
  });

  it("preserves the current image when storage fails and sweeps interrupted uploads", async () => {
    const first = await replaceImage("e2e-owner", listTarget(), "First", bytes);
    vi.spyOn(mediaStorage, "put").mockRejectedValueOnce(
      new Error("Storage offline"),
    );
    await expect(
      replaceImage("e2e-owner", listTarget(), "Failed", bytes),
    ).rejects.toThrow("Storage offline");
    expect(await readableImage(first.id, "e2e-owner")).not.toBeNull();
    expect(await prisma.media.count({ where: { state: "PENDING" } })).toBe(1);
    expect((await cleanupMedia()).deleted).toBe(0);
    await prisma.media.updateMany({
      where: { state: "PENDING" },
      data: { cleanupAfter: expired },
    });
    expect((await cleanupMedia()).deleted).toBe(1);
  });

  it("keeps durable cleanup records for deleted wishes and cascading list deletion", async () => {
    const a = await replaceImage("e2e-owner", listTarget(), "List", bytes);
    const b = await replaceImage("e2e-owner", wishTarget(), "Wish", bytes);
    await deleteWish("e2e-owner", listId, wishId);
    expect(await readableImage(b.id, "e2e-owner")).toBeNull();
    ({ id: wishId } = await createWish("e2e-owner", listId, {
      title: "Another",
    }));
    const c = await replaceImage("e2e-owner", wishTarget(), "Another", bytes);
    await deleteWishlist("e2e-owner", listId);
    await prisma.media.updateMany({
      where: detach,
      data: { cleanupAfter: expired },
    });
    expect((await cleanupMedia()).deleted).toBe(3);
    expect(
      await prisma.media.count({ where: { id: { in: [a.id, b.id, c.id] } } }),
    ).toBe(0);
  });

  it("serializes concurrent replacements without losing cleanup records", async () => {
    const images = await Promise.all([
      replaceImage("e2e-owner", listTarget(), "A", bytes),
      replaceImage("e2e-owner", listTarget(), "B", bytes),
    ]);
    const visible = await Promise.all(
      images.map(({ id }) => readableImage(id, "e2e-owner")),
    );
    expect(visible.filter(Boolean)).toHaveLength(1);
    expect((await cleanupMedia()).deleted).toBe(1);
  });

  it("rechecks permission after storage reads and returns private errors during an outage", async () => {
    await setWishlistPublication("e2e-owner", listId, "PUBLISHED");
    const image = await replaceImage("e2e-owner", listTarget(), "List", bytes);
    auth.id = null;
    const get = mediaStorage.get.bind(mediaStorage);
    vi.spyOn(mediaStorage, "get").mockImplementationOnce(async (...args) => {
      const result = await get(...args);
      await setWishlistPublication("e2e-owner", listId, "DRAFT");
      return result;
    });
    expect((await read(image.id)).status).toBe(404);
    auth.id = "e2e-owner";
    vi.spyOn(mediaStorage, "get").mockRejectedValueOnce(new Error("Offline"));
    const response = await read(image.id);
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("enforces origin, session, decoded content, description and rate limits on direct API requests", async () => {
    const request = (origin = testOrigin, body: Buffer = bytes) =>
      new Request(`${testOrigin}/api/media?kind=list&listId=${listId}`, {
        method: "POST",
        headers: { origin, "X-Image-Description": "A%20camera" },
        body: new Uint8Array(body),
      });
    expect((await POST(request("https://other.example"))).status).toBe(403);
    auth.id = null;
    expect((await POST(request())).status).toBe(401);
    auth.id = "e2e-member";
    expect((await POST(request())).status).toBe(400);
    auth.id = "e2e-owner";
    expect(
      (await POST(request(testOrigin, Buffer.from("fake.png")))).status,
    ).toBe(400);
    expect((await POST(request())).status).toBe(200);
    expect(
      (
        await DELETE(
          new Request(`${testOrigin}/api/media?kind=list&listId=${listId}`, {
            method: "DELETE",
            headers: { origin: testOrigin },
          }),
        )
      ).status,
    ).toBe(200);
    await prisma.authRateLimit.updateMany({ data: { attempts: 100 } });
    expect((await POST(request())).status).toBe(429);
  });
});
