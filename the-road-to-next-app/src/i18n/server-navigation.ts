import { revalidatePath as nextRevalidatePath } from "next/cache";
import { redirect as nextRedirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { locales, localizedPath } from "./config";

export async function redirect(
  path: string,
  type?: "push" | "replace",
): Promise<never> {
  nextRedirect(localizedPath(path, await getLocale()), type);
}

export function revalidatePath(path: string, type?: "layout" | "page") {
  for (const locale of locales) {
    nextRevalidatePath(localizedPath(path, locale), type);
  }
}
