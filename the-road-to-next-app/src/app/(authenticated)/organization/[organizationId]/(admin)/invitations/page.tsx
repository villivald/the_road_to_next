import { Suspense } from "react";
import Heading from "@/components/heading";
import Spinner from "@/components/spinner";
import { InvitationList } from "@/features/invitation/components/invitation-list";
import OrganizationBreadcrumbs from "../_navigation/tabs";

type InvitationsPageProps = {
  params: Promise<{
    organizationId: string;
  }>;
};

const InvitationsPage = async ({ params }: InvitationsPageProps) => {
  const { organizationId } = await params;

  return (
    <div className="flex flex-1 flex-col gap-y-8">
      <Heading
        title="Invitations"
        description="Manage your organization's invitations"
        tabs={<OrganizationBreadcrumbs />}
      />

      <Suspense fallback={<Spinner />}>
        <InvitationList organizationId={organizationId} />
      </Suspense>
    </div>
  );
};

export default InvitationsPage;
