"use client";

import { format } from "date-fns";
import { useActionState } from "react";
import { FieldError } from "@/components/form/field-error";
import { Form } from "@/components/form/form";
import { SubmitButton } from "@/components/form/submit-button";
import {
  ActionState,
  EMPTY_ACTION_STATE,
} from "@/components/form/utils/to-action-state";
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
  onUpdateComment?: (updatedComment: CommentWithMetadata) => void;
};

const CommentUpdateForm = ({
  comment,
  isOwner,
  setIsInEditMode,
  onUpdateComment,
}: CommentUpdateProps) => {
  const [actionState, action] = useActionState(
    updateComment,
    EMPTY_ACTION_STATE,
  );

  const handleSuccess = (actionState: ActionState) => {
    setIsInEditMode?.("");
    onUpdateComment?.({
      ...comment,
      content: actionState.data as string,
    });
  };

  return (
    <div className="flex gap-x-2">
      <Card className="flex flex-1 flex-col gap-y-1 p-4">
        <div className="flex justify-between">
          <p className="text-sm text-muted-foreground">
            {comment.user?.username ?? "Deleted User"}
          </p>
          <p className="text-sm text-muted-foreground">
            {format(comment.createdAt, "yyyy-MM-dd, HH:mm")}
          </p>
        </div>

        <Form
          action={action}
          actionState={actionState}
          onSuccess={handleSuccess}
        >
          <input type="hidden" name="commentId" value={comment.id} />
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            name="content"
            defaultValue={comment?.content}
          />
          <FieldError actionState={actionState} name="content" />

          {isOwner ? (
            <div className="flex items-center justify-end gap-x-2">
              <SubmitButton label="Update" />
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsInEditMode?.("")}
              >
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
