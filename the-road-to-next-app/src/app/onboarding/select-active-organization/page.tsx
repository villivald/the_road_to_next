import { LucidePlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Heading from "@/components/heading";
import Spinner from "@/components/spinner";
import { Button } from "@/components/ui/button";
import OrganizationList from "@/features/organization/components/organization-list";
import { getOrganizationsByUser } from "@/features/organization/queries/get-organizations-by-user";
import { onboardingPath, organizationsPath } from "@/paths";

const SelectActiveOrganizationPage = async () => {
  const organizations = await getOrganizationsByUser();

  const hasActive = organizations.some((org) => org.membershipByUser.isActive);

  if (hasActive) {
    redirect(organizationsPath);
  }

  return (
    <div className="flex flex-1 flex-col gap-y-8">
      <Heading
        title="Select Organization"
        description="Please select an organization to continue"
        actions={
          <Button asChild>
            <Link href={onboardingPath}>
              <LucidePlus className="h-4 w-4" />
              Create Organization
            </Link>
          </Button>
        }
      />

      <Suspense fallback={<Spinner />}>
        <OrganizationList limitedAccess />
      </Suspense>
    </div>
  );
};

export default SelectActiveOrganizationPage;
