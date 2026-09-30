import { getAuth } from "@/features/auth/actions/get-auth";
import { readableImage } from "@/features/media/service/media";
import { mediaStorage } from "@/features/media/service/storage";
import { wishlistIdSchema } from "@/features/wishlist/service/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headers = {
    "Cache-Control": "private, no-store, max-age=0",
    "CDN-Cache-Control": "no-store",
    "Vercel-CDN-Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "same-origin",
    Vary: "Cookie",
  };
  const { id } = await params;

  if (!wishlistIdSchema.safeParse(id).success) {
    return new Response(null, { status: 404, headers });
  }

  const { user } = await getAuth();
  const media = await readableImage(id, user?.id ?? null);

  if (!media) {
    return new Response(null, { status: 404, headers });
  }

  try {
    const body = await mediaStorage.get(media.provider, media.pathname);

    // Storage I/O may outlive a permission change. Recheck before delivering bytes.
    if (!body || !(await readableImage(id, user?.id ?? null))) {
      if (body instanceof ReadableStream) {
        await body.cancel();
      }
      return new Response(null, { status: 404, headers });
    }

    return new Response(body as BodyInit, {
      headers: { ...headers, "Content-Type": "image/webp" },
    });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
