import { CardCompact } from "@/components/card-compact";
import { getAuth } from "@/features/auth/actions/get-auth";
import { isOwner } from "@/features/auth/utils/is-owner";
import { getComments } from "../queries/get-comments";
import { CommentCreateForm } from "./comment-create-form";
import { CommentItem } from "./comment-item";

type CommentsProps = {
  ticketId: string;
};

const Comments = async ({ ticketId }: CommentsProps) => {
  const comments = await getComments(ticketId);
  const { user } = await getAuth();

  return (
    <>
      <CardCompact
        title="Add Comment"
        description="You can add comments to this ticket."
        content={<CommentCreateForm ticketId={ticketId} />}
      />

      <div className="ml-8 flex flex-col gap-y-2">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            isOwner={isOwner(user, comment)}
          />
        ))}
      </div>
    </>
  );
};

export { Comments };
