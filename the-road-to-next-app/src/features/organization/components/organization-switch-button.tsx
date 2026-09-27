"use client";

import { useActionState } from "react";
import { Form } from "@/components/form/form";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import { switchOrganization } from "../actions/switch-organization";

type OrganizationSwitchButtonProps = {
  organizationId: string;
  trigger: React.ReactElement;
};

const OrganizationSwitchButton = ({
  organizationId,
  trigger,
}: OrganizationSwitchButtonProps) => {
  const [actionState, action] = useActionState(
    switchOrganization,
    EMPTY_ACTION_STATE,
  );
  return (
    <Form action={action} actionState={actionState}>
      <input type="hidden" name="organizationId" value={organizationId} />
      {trigger}
    </Form>
  );
};

export { OrganizationSwitchButton };
