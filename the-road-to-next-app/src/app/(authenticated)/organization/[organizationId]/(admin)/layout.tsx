import { getAdminOrRedirect } from "@/features/membership/queries/get-admin-or-redirect";

export default async function AuthenticatedLayout({
  children,
  params,
}: {
  children: Readonly<React.ReactNode>;
  params: Promise<{
    organizationId: string;
  }>;
}) {
  const { organizationId } = await params;

  await getAdminOrRedirect(organizationId);

  return <>{children}</>;
}
