"use client";

import { useActionState } from "react";
import { FieldError } from "@/components/form/field-error";
import { Form } from "@/components/form/form";
import { SubmitButton } from "@/components/form/submit-button";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import { Input } from "@/components/ui/input";
import { passwordChange } from "../actions/password-change";

const PasswordChangeForm = () => {
  const [actionState, action] = useActionState(
    passwordChange,
    EMPTY_ACTION_STATE,
  );

  return (
    <Form action={action} actionState={actionState}>
      <Input
        name="password"
        placeholder="Password"
        defaultValue={actionState?.payload?.get("password") as string}
      />
      <FieldError name="password" actionState={actionState} />

      <SubmitButton label="Send Password Reset Link to Email" />
    </Form>
  );
};
export default PasswordChangeForm;
