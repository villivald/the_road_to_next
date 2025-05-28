"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { CommentWithMetadata } from "../types";
import { CommentButtons } from "./comment-buttons";
import { CommentUpdateForm } from "./comment-update-form";

type CommentItemProps = {
  comment: CommentWithMetadata;
  isOwner?: boolean;
};

const CommentItem = ({ comment, isOwner }: CommentItemProps) => {
  const [isInEditMode, setIsInEditMode] = useState("");

  if (isInEditMode === comment.id) {
    return (
      <CommentUpdateForm
        comment={comment}
        isOwner={isOwner}
        setIsInEditMode={setIsInEditMode}
      />
    );
  }

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
        <p className="whitespace-pre-line">{comment.content}</p>
      </Card>

      <div className="flex flex-col gap-y-1">
        {isOwner ? (
          <CommentButtons id={comment.id} setIsInEditMode={setIsInEditMode} />
        ) : null}
      </div>
    </div>
  );
};

export { CommentItem };
