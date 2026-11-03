import { redirect } from "@/i18n/server-navigation";
import { listsPath } from "@/paths";

export default async function SharedListsPage({
  searchParams,
}: {
  searchParams: Promise<{
    joined?: string;
    left?: string;
    roleChanged?: string;
  }>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams({ shared: "1" });
  for (const key of ["joined", "left", "roleChanged"] as const) {
    if (query[key] === "1") params.set(key, "1");
  }
  return redirect(`${listsPath}?${params}`);
}
