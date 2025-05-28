"use client";

import { User as AuthUser } from "lucia";
import { useState } from "react";
import { CardCompact } from "@/components/card-compact";
import { Button } from "@/components/ui/button";
import { isOwner } from "@/features/auth/utils/is-owner";
import { getComments } from "../queries/get-comments";
import { CommentWithMetadata } from "../types";
import { CommentCreateForm } from "./comment-create-form";
import { CommentItem } from "./comment-item";

type CommentsProps = {
  ticketId: string;
  user: AuthUser | null;
  paginatedComments?: {
    list: CommentWithMetadata[];
    metadata: { count: number; hasNext: boolean };
  };
};

const Comments = ({ ticketId, paginatedComments, user }: CommentsProps) => {
  const [comments, setComments] = useState(paginatedComments?.list || []);
  const [metadata, setMetadata] = useState(paginatedComments?.metadata);

  const handleMore = async () => {
    const morePaginatedComments = await getComments(ticketId, comments.length);
    const moreComments = morePaginatedComments.list;

    setComments([...comments, ...moreComments]);
    setMetadata({
      count: morePaginatedComments.metadata.count,
      hasNext: morePaginatedComments.metadata.hasNext,
    });
  };

  const handleDeleteComment = (id: string) => {
    setComments((prevComments) =>
      prevComments.filter((comment) => comment.id !== id),
    );
  };

  const handleUpdateComment = (updatedComment: CommentWithMetadata) => {
    setComments((prevComments) =>
      prevComments.map((comment) =>
        comment.id === updatedComment.id ? updatedComment : comment,
      ),
    );
  };

  const handleCreateComment = (newComment: CommentWithMetadata | undefined) => {
    if (!newComment) return;

    setComments((prevComments) => [newComment, ...prevComments]);
  };

  return (
    <>
      <CardCompact
        title="Add Comment"
        description="You can add comments to this ticket."
        content={
          <CommentCreateForm
            ticketId={ticketId}
            onCreateComment={handleCreateComment}
          />
        }
      />

      <div className="ml-8 flex flex-col gap-y-2">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            isOwner={isOwner(user, comment)}
            onDeleteComment={handleDeleteComment}
            onUpdateComment={handleUpdateComment}
          />
        ))}
      </div>

      {metadata?.hasNext && (
        <div className="ml-4 flex flex-col justify-center">
          <Button variant="ghost" onClick={handleMore}>
            More
          </Button>
        </div>
      )}
    </>
  );
};

export { Comments };
