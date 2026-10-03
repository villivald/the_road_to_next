import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { getAuth } from "@/features/auth/actions/get-auth";
import { limitSourceRequest } from "@/features/auth/service/request-limit";
import { AuthError, consumeRateLimit } from "@/features/auth/service/security";
import {
  authorizeImageChange,
  removeImage,
  replaceImage,
} from "@/features/media/service/media";
import { readImageBody } from "@/features/media/service/validation";
import { MediaError } from "@/features/media/types";
import { WishlistError } from "@/features/wishlist/service/lists";
import { browsePath, reservationsPath } from "@/paths";

export const runtime = "nodejs";
export const maxDuration = 60;

const changeImage = async (request: Request) => {
  const headers = { "Cache-Control": "private, no-store" };
  const reply = (message: string, status: number) =>
    Response.json({ message }, { status, headers });
  const origin = process.env.APP_URL;

  if (!origin || request.headers.get("origin") !== new URL(origin).origin) {
    return reply("This request is not allowed.", 403);
  }

  const { user } = await getAuth();

  if (!user?.emailVerified) {
    return reply("Sign in with a verified account to change images.", 401);
  }

  try {
    await limitSourceRequest("image-request");
    await consumeRateLimit("image-request", user.id, 60, 60 * 60 * 1000);
    const query = Object.fromEntries(new URL(request.url).searchParams);
    const target = await authorizeImageChange(user.id, query);

    if (request.method === "DELETE") {
      await removeImage(user.id, target);
    } else {
      await replaceImage(
        user.id,
        target,
        decodeURIComponent(request.headers.get("x-image-description") ?? ""),
        await readImageBody(request),
      );
    }

    revalidatePath("/lists", "layout");
    revalidatePath(browsePath);
    revalidatePath(reservationsPath);
    revalidatePath("/account/profile");
    return reply(
      request.method === "DELETE" ? "Image removed." : "Image saved.",
      200,
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return reply(error.message, 429);
    }

    if (error instanceof WishlistError || error instanceof MediaError) {
      return reply(error.message, 400);
    }

    if (error instanceof ZodError) {
      return reply(
        "Check the image target and add a description of 1–300 characters.",
        400,
      );
    }

    return reply(
      "The image could not be saved. Please try again; your existing image is unchanged.",
      503,
    );
  }
};

export const POST = changeImage;
export const DELETE = changeImage;
