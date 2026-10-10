import { withoutLocale } from "@/i18n/config";
import { browsePath, listsPath, reservationsPath } from "@/paths";

// Only known viewing routes are valid login destinations. Reject encoded paths,
// protocol-relative URLs, backslashes, queries, and control characters.
export const safeReturnTo = (value: unknown) => {
  if (typeof value !== "string" || value !== value.trim()) {
    return listsPath;
  }

  const path = withoutLocale(value);
  return [browsePath, listsPath, reservationsPath].includes(path) ||
    /^\/invitations\/[a-zA-Z0-9_-]{1,128}$/.test(path) ||
    /^\/lists\/[a-zA-Z0-9_-]{1,128}(?:\/wishes\/[a-zA-Z0-9_-]{1,128})?$/.test(
      path,
    )
    ? value
    : listsPath;
};

export const authReturnPath = (path: string, destination: unknown) => {
  const returnTo = safeReturnTo(destination);
  return returnTo === listsPath
    ? path
    : `${path}?${new URLSearchParams({ returnTo })}`;
};
