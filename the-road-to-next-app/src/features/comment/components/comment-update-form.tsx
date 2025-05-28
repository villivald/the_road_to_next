"use client";

import { useActionState, useEffect } from "react";
import { FieldError } from "@/components/form/field-error";
import { Form } from "@/components/form/form";
import { SubmitButton } from "@/components/form/submit-button";
import { EMPTY_ACTION_STATE } from "@/components/form/utils/to-action-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateComment } from "../actions/update-comment";
import { CommentWithMetadata } from "../types";

type CommentUpdateProps = {
  comment: CommentWithMetadata;
  isOwner?: boolean;
  setIsInEditMode?: (id: string) => void;
};

const CommentUpdateForm = ({
  comment,
  isOwner,
  setIsInEditMode,
}: CommentUpdateProps) => {
  const [actionState, action] = useActionState(
    updateComment.bind(null, comment?.id),
    EMPTY_ACTION_STATE,
  );

  useEffect(() => {
    if (actionState.status === "SUCCESS" && setIsInEditMode) {
      setIsInEditMode("");
    }
  }, [actionState.status, setIsInEditMode]);

  const sudbitButtonIsDisabled =
    actionState.status === "PENDING" || actionState.status === "ERROR";

  return (
    <div className="flex gap-x-2">
      <Card className="flex flex-1 flex-col gap-y-1 p-4">
        <div className="flex justify-between">
          <p className="text-sm text-muted-foreground">
            {comment.user?.username ?? "Deleted User"}
          </p>
          <p className="text-sm text-muted-foreground">
            {comment.createdAt.toLocaleString()}
          </p>
        </div>

        <Form action={action} actionState={actionState}>
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            name="content"
            defaultValue={comment?.content}
          />
          <FieldError actionState={actionState} name="content" />

          {isOwner ? (
            <div className="flex items-center justify-end gap-x-2">
              <SubmitButton
                isDisabled={sudbitButtonIsDisabled}
                label="Update"
              />
              <Button variant="outline" onClick={() => setIsInEditMode?.("")}>
                Cancel
              </Button>
            </div>
          ) : null}
        </Form>
      </Card>
    </div>
  );
};

export { CommentUpdateForm };
