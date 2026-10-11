export type DetailSection = "browse" | "lists" | "reservations";

export const detailSection = (
  from: string | undefined,
  canManage: boolean,
): DetailSection =>
  from === "browse" || from === "reservations" || from === "lists"
    ? from
    : canManage
      ? "lists"
      : "browse";

export const navigationPath = (path: string, section?: DetailSection) =>
  section ? `${path}${path.includes("?") ? "&" : "?"}from=${section}` : path;
