import { getAuthOrRedirect } from "@/features/auth/queries/get-auth-or-redirect";

export default async function AuthenticatedLayout({
  children,
}: {
  children: Readonly<React.ReactNode>;
}) {
  await getAuthOrRedirect();

  return <>{children}</>;
}
