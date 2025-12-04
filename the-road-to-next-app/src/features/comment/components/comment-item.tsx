"use client";

import { format } from "date-fns";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CommentWithMetadata } from "../types";
import { CommentButtons } from "./comment-buttons";
import { CommentUpdateForm } from "./comment-update-form";

type CommentItemProps = {
  comment: CommentWithMetadata;
  isOwner: boolean;
  sections: { label: string; content: React.ReactNode }[];
  onDeleteComment?: (id: string) => void;
  onUpdateComment?: (updatedComment: CommentWithMetadata) => void;
};

const CommentItem = ({
  comment,
  isOwner,
  sections,
  onDeleteComment,
  onUpdateComment,
}: CommentItemProps) => {
  const [isInEditMode, setIsInEditMode] = useState("");

  if (isInEditMode === comment.id) {
    return (
      <CommentUpdateForm
        comment={comment}
        isOwner={isOwner}
        setIsInEditMode={setIsInEditMode}
        onUpdateComment={onUpdateComment}
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
            {format(comment.createdAt, "yyyy-MM-dd, HH:mm")}
          </p>
        </div>
        <p className="whitespace-pre-line">{comment.content}</p>

        {sections.map((section) => (
          <div key={section.label} className="mt-2 space-y-2">
            <Separator />
            <h4 className="text-sm text-muted-foreground">{section.label}</h4>
            <div>{section.content}</div>
          </div>
        ))}
      </Card>

      <div className="flex flex-col gap-y-1">
        {isOwner ? (
          <CommentButtons
            id={comment.id}
            setIsInEditMode={setIsInEditMode}
            onDeleteComment={onDeleteComment}
          />
        ) : null}
      </div>
    </div>
  );
};

export { CommentItem };
