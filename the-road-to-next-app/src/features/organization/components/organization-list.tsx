import { format } from "date-fns";
import {
  LucideArrowLeftRight,
  LucideArrowUpRightFromSquare,
  LucidePen,
} from "lucide-react";
import Link from "next/link";
import { SubmitButton } from "@/components/form/submit-button";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MembershipDeleteButton } from "@/features/membership/components/membership-delete-button";
import { membershipsPath } from "@/paths";
import { getOrganizationsByUser } from "../queries/get-organizations-by-user";
import { OrganizationDeleteButton } from "./organization-delete-button";
import { OrganizationSwitchButton } from "./organization-switch-button";

type OrganizationListProps = {
  limitedAccess?: boolean;
};

const OrganizationList = async ({ limitedAccess }: OrganizationListProps) => {
  const organizations = await getOrganizationsByUser();

  const hasActive = organizations.some((org) => org.membershipByUser.isActive);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Joined At</TableHead>
          <TableHead>Members</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {organizations.map((organization) => {
          const isActive = organization.membershipByUser.isActive;

          const switchButton = (
            <OrganizationSwitchButton
              organizationId={organization.id}
              trigger={
                <SubmitButton
                  label={
                    !hasActive ? "Activate" : isActive ? "Active" : "Switch"
                  }
                  icon={<LucideArrowLeftRight />}
                  variant={
                    !hasActive ? "secondary" : isActive ? "default" : "outline"
                  }
                />
              }
            />
          );

          const detailButton = (
            <Button variant="outline" size="icon" asChild>
              <Link href={membershipsPath(organization.id)}>
                <LucideArrowUpRightFromSquare className="h-4 w-4" />
              </Link>
            </Button>
          );

          const editButton = (
            <Button variant="outline" size="icon">
              <LucidePen className="h-4 w-4" />
            </Button>
          );

          const deleteButton = (
            <OrganizationDeleteButton organizationId={organization.id} />
          );

          const leaveButton = (
            <MembershipDeleteButton
              organizationId={organization.id}
              userId={organization.membershipByUser.userId}
              pendingMessage="Leaving organization..."
            />
          );

          const buttons = (
            <>
              {switchButton}
              {limitedAccess ? null : (
                <>
                  {detailButton}
                  {editButton}
                  {leaveButton}
                  {deleteButton}
                </>
              )}
            </>
          );

          return (
            <TableRow key={organization.id}>
              <TableCell>{organization.id}</TableCell>
              <TableCell>{organization.name}</TableCell>
              <TableCell>
                {format(
                  organization.membershipByUser.joinedAt,
                  "yyyy-MM-dd, HH:mm",
                )}
              </TableCell>
              <TableCell>{organization._count.memberships}</TableCell>
              <TableCell className="flex justify-end gap-x-2">
                {buttons}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default OrganizationList;
