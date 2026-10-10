import { del, get, put } from "@vercel/blob";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MediaProvider } from "@/generated/prisma/client";

export const storageProvider = (): MediaProvider => {
  const provider =
    process.env.MEDIA_STORAGE ?? (process.env.VERCEL ? "vercel" : "local");

  if (provider === "vercel") {
    return "VERCEL";
  }

  if (provider !== "local" || process.env.VERCEL) {
    throw new Error(
      "Configure private Vercel Blob storage for this deployment.",
    );
  }

  return "LOCAL";
};

const localPath = (pathname: string) => {
  if (process.env.VERCEL || !/^images\/[a-f0-9-]{36}\.webp$/.test(pathname)) {
    throw new Error("Invalid local media path");
  }

  return path.join(
    process.cwd(),
    ".local",
    process.env.MEDIA_LOCAL_NAMESPACE === "test" ? "media-test" : "media",
    pathname,
  );
};

export const mediaStorage = {
  async put(provider: MediaProvider, pathname: string, data: Buffer) {
    if (provider === "VERCEL") {
      await put(pathname, data, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: "image/webp",
        abortSignal: AbortSignal.timeout(30_000),
      });
      return;
    }

    const filename = localPath(pathname);
    await mkdir(path.dirname(filename), { recursive: true });
    await writeFile(filename, data, { flag: "wx", mode: 0o600 });
  },

  async get(
    provider: MediaProvider,
    pathname: string,
  ): Promise<ReadableStream<Uint8Array> | Uint8Array | null> {
    if (provider === "VERCEL") {
      const result = await get(pathname, {
        access: "private",
        abortSignal: AbortSignal.timeout(15_000),
      });
      return result?.statusCode === 200 ? result.stream : null;
    }

    try {
      return new Uint8Array(await readFile(localPath(pathname)));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  },

  async delete(provider: MediaProvider, pathname: string) {
    if (provider === "VERCEL") {
      await del(pathname, { abortSignal: AbortSignal.timeout(15_000) });
      return;
    }

    await rm(localPath(pathname), { force: true });
  },
};
