export const locales = ["en", "fi"] as const;
export type Locale = (typeof locales)[number];
export const isLocale = (value: unknown): value is Locale =>
  value === "en" || value === "fi";
export const resolveLocale = (value: unknown): Locale =>
  isLocale(value) ? value : "en";
export const languageTag = (locale: string) =>
  locale === "fi" ? "fi-FI" : "en-GB";

export const withoutLocale = (path: string) =>
  path.replace(/^\/(en|fi)(?=\/|\?|#|$)/, "") || "/";

export const localizedPath = (path: string, locale: string) => {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  if (/^\/(api|_next)(\/|$)/.test(path)) return path;
  const bare = withoutLocale(path);
  return `/${resolveLocale(locale)}${bare === "/" ? "" : bare}`;
};
