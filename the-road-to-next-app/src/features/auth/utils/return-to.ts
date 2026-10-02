import { browsePath, listsPath, reservationsPath } from "@/paths";

// Only known viewing routes are valid login destinations. Reject encoded paths,
// protocol-relative URLs, backslashes, queries, and control characters.
export const safeReturnTo = (value: unknown) => {
  if (typeof value !== "string" || value !== value.trim()) {
    return listsPath;
  }

  return [browsePath, listsPath, reservationsPath].includes(value) ||
    /^\/lists\/[a-zA-Z0-9_-]{1,128}(?:\/wishes\/[a-zA-Z0-9_-]{1,128})?$/.test(
      value,
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
