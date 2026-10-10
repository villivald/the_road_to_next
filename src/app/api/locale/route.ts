import { cookies } from "next/headers";
import { getAuth } from "@/features/auth/actions/get-auth";
import { isLocale } from "@/i18n/config";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const origin = new URL(process.env.APP_URL ?? request.url).origin;
  if (request.headers.get("origin") !== origin) {
    return new Response(null, { status: 403 });
  }
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  let locale = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (locale.length + value.byteLength > 2) {
        await reader.cancel();
        return new Response(null, { status: 400 });
      }
      locale += String.fromCharCode(...value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!isLocale(locale)) return new Response(null, { status: 400 });
  const { user } = await getAuth();
  if (user)
    await prisma.user.update({ where: { id: user.id }, data: { locale } });
  (await cookies()).set("wishlist-locale", locale, {
    path: "/",
    maxAge: 31536000,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
