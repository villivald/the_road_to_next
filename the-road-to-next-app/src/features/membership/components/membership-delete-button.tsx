"use client";

import { LucideLoaderCircle, LucideLogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { deleteMembership } from "../actions/delete-membership";

type MembershipDeleteButtonProps = {
  organizationId: string;
  userId: string;
  pendingMessage: string;
};

const MembershipDeleteButton = ({
  organizationId,
  userId,
  pendingMessage,
}: MembershipDeleteButtonProps) => {
  const router = useRouter();

  const [deleteButton, deleteDialog] = useConfirmDialog({
    action: deleteMembership.bind(null, organizationId, userId),
    trigger: (isPending) => (
      <Button variant="destructive" size="icon">
        {isPending ? (
          <LucideLoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <LucideLogOut className="h-4 w-4" />
        )}
      </Button>
    ),
    onSuccess: () => {
      router.refresh();
    },
    pendingMessage,
  });

  return (
    <>
      {deleteButton}
      {deleteDialog}
    </>
  );
};

export { MembershipDeleteButton };
